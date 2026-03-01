import { expect, test, type Page } from '@playwright/test'
import { API_BASE, ensureOwnerSession, resetE2EData } from './helpers/session'

test.afterEach(async ({ request }) => {
  await resetE2EData(request)
})

async function forceAssistRollout(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('rodando.assist.rollout.v1', '0')
  })
}

async function dismissAssistOverlayIfVisible(page: Page) {
  const overlay = page.getByTestId('assist-overlay-intro')
  if ((await overlay.count()) === 0) return
  if (await overlay.first().isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(overlay).toHaveCount(0)
  }
}

test('assist: overlay inicial e checklist da Home persistem para visitante', async ({ page }) => {
  await forceAssistRollout(page)
  await page.goto('/')

  await expect(page.getByTestId('assist-overlay-intro')).toBeVisible()
  await page.getByRole('button', { name: 'Entendi' }).click()
  await expect(page.getByTestId('assist-checklist-card')).toBeVisible()

  await page.getByTestId('home-catalog-cta').click()
  await expect(page).toHaveURL(/\/catalog/)

  const persistedState = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('rodando.assist.local.v1') || '{}'),
  )
  expect(Boolean(persistedState?.home?.overlaySeen)).toBeTruthy()
  expect(Boolean(persistedState?.home?.checklistState?.['open-catalog'])).toBeTruthy()

  await page.goto('/')
  await expect(page.getByTestId('assist-overlay-intro')).toHaveCount(0)
})

test('assist: checkout incompleto exibe guia de correção e ação destrutiva exige confirmação', async ({ page, request }) => {
  await forceAssistRollout(page)
  await ensureOwnerSession(request)

  const suffix = Date.now()
  const customerEmail = `assist_checkout_${suffix}@rodando.local`

  const createdProduct = await request.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: `Assist Produto ${suffix}`,
      sku: `ASSIST-${suffix}`,
      manufacturer: 'QA Assist',
      category: 'Teste',
      bikeModel: 'CG 160',
      price: 99.9,
      stock: 9,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Produto para validar guardrails do modo assistido.',
      isActive: true,
    },
  })
  expect(createdProduct.ok()).toBeTruthy()
  const productPayload = await createdProduct.json()
  const productId = Number(productPayload?.item?.id)
  expect(Number.isInteger(productId)).toBeTruthy()

  const signup = await request.post(`${API_BASE}/api/auth/signup`, {
    data: {
      name: 'Assist Customer',
      email: customerEmail,
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    },
  })
  expect(signup.ok()).toBeTruthy()

  await page.goto('/catalog')
  await dismissAssistOverlayIfVisible(page)
  await page.getByLabel('Buscar produto').fill(`Assist Produto ${suffix}`)
  await page.getByRole('button', { name: 'Aplicar filtros' }).first().click()
  await expect(page.getByText(`Assist Produto ${suffix}`).first()).toBeVisible()
  await page.getByTestId(`catalog-add-${productId}`).click()

  await page.goto('/cart')
  await dismissAssistOverlayIfVisible(page)
  await expect(page.getByText(`Assist Produto ${suffix}`)).toBeVisible()

  const recipientInput = page.getByLabel(/Destinat[aá]rio/i)
  await recipientInput.fill('')
  await expect(page.getByTestId('cart-checkout-button')).toBeDisabled()
  await expect(page.getByText('Falta concluir:')).toBeVisible()
  await expect(page.getByText('Informar nome do destinatário')).toBeVisible()

  await page.getByTestId('cart-clear').click()
  await expect(page.getByRole('dialog', { name: 'Limpar mochila?' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByText(`Assist Produto ${suffix}`)).toBeVisible()
})

test('assist: owner persiste progresso ao abrir fluxo de novo produto', async ({ page, request }) => {
  await forceAssistRollout(page)
  await ensureOwnerSession(page.request)

  await page.goto('/owner/products')
  await dismissAssistOverlayIfVisible(page)
  await page.getByRole('button', { name: 'Novo produto' }).click()
  await expect(page).toHaveURL(/\/owner\/products\/new/)

  const assistStateResponse = await request.get(`${API_BASE}/api/ux/assist/state?scope=owner`)
  expect(assistStateResponse.ok()).toBeTruthy()
  const assistPayload = await assistStateResponse.json()
  const ownerProductsState = (assistPayload?.items || []).find(
    (item: { routeKey?: string }) => item?.routeKey === 'owner-products',
  )
  expect(Boolean(ownerProductsState)).toBeTruthy()
  expect(Boolean(ownerProductsState?.checklistState?.['open-create'])).toBeTruthy()
})
