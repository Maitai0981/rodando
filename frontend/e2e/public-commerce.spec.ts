import { expect, test } from '@playwright/test'
import { API_BASE, ensureOwnerSession, resetE2EData } from './helpers/session'

test.afterEach(async ({ request }) => {
  await resetE2EData(request)
})

async function createSellableProduct(request: Parameters<typeof ensureOwnerSession>[0], suffix: number, namePrefix: string) {
  await ensureOwnerSession(request)
  const response = await request.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: `${namePrefix} ${suffix}`,
      sku: `E2E-${suffix}`,
      manufacturer: 'QA Factory',
      category: 'Teste',
      bikeModel: 'CG 160',
      price: 199.9,
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
      description: 'Produto criado para validar busca, checkout e pedidos.',
      isActive: true,
    },
  })
  expect(response.ok()).toBeTruthy()
  return `${namePrefix} ${suffix}`
}

test('signup, busca pelo header, checkout Mercado Pago e atalho de pedidos funcionam juntos', async ({ page, request }) => {
  const suffix = Date.now()
  const productName = await createSellableProduct(request, suffix, 'Produto Mercado Pago')
  const customerEmail = `customer_e2e_${suffix}@rodando.local`

  await page.goto('/auth/signup')
  await page.getByTestId('signup-name-input').fill('Cliente Pix')
  await page.getByTestId('signup-email-input').fill(customerEmail)
  await page.getByTestId('signup-cep-input').fill('01001-000')
  await page.getByTestId('signup-password-input').fill('123456')
  await page.getByTestId('signup-submit-button').click()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.getByLabel('Buscar no catálogo').fill(productName)
  await page.getByRole('button', { name: /^Buscar$/ }).click()
  await expect(page).toHaveURL(new RegExp(`/catalog\\?q=${encodeURIComponent(productName).replace(/%20/g, '%20')}`))
  await expect(page.getByText(productName).first()).toBeVisible()

  await page.getByRole('button', { name: /^Adicionar$/ }).first().click()
  await page.goto('/cart')
  await expect(page.getByText(productName)).toBeVisible()

  await page.getByRole('button', { name: 'Finalizar pedido' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  await page.getByRole('button', { name: /^Continuar$/ }).click()
  await expect(page.getByRole('heading', { name: 'Metodo de pagamento' })).toBeVisible()
  await page.getByRole('button', { name: /^Gerar pagamento$/ }).click()
  await expect(page.getByText('Checkout Mercado Pago gerado')).toBeVisible()
  await page.getByRole('link', { name: 'Ir para o Mercado Pago' }).click()
  await expect(page).toHaveURL(/\/orders\/\d+/)
  await expect(page.getByRole('heading', { name: /Pedido #\d+/ })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar' }).click()
  await page.getByRole('link', { name: 'Meus pedidos' }).first().click()
  await expect(page).toHaveURL(/\/orders/)
  await expect(page.getByRole('heading', { name: 'Meus pedidos' })).toBeVisible()
  await expect(page.getByText(/Pedido #/).first()).toBeVisible()
})

test('signin, busca publica e checkout via Pix permanecem operacionais', async ({ page, request }) => {
  const suffix = Date.now()
  const productName = await createSellableProduct(request, suffix, 'Produto Cartao')
  const customerEmail = `customer_e2e_${suffix}@rodando.local`

  const signup = await request.post(`${API_BASE}/api/auth/signup`, {
    data: {
      name: 'Cliente Cartao',
      email: customerEmail,
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    },
  })
  expect(signup.ok()).toBeTruthy()

  await page.goto('/auth')
  await page.getByTestId('signin-email-input').fill(customerEmail)
  await page.getByTestId('signin-password-input').fill('123456')
  await page.getByTestId('signin-submit-button').click()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.getByLabel('Buscar no catálogo').fill(productName)
  await page.getByRole('button', { name: /^Buscar$/ }).click()
  await expect(page.getByText(productName).first()).toBeVisible()

  await page.getByRole('button', { name: /^Adicionar$/ }).first().click()
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Finalizar pedido' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  await page.getByRole('button', { name: /^Continuar$/ }).click()
  await expect(page.getByRole('heading', { name: 'Metodo de pagamento' })).toBeVisible()
  await page.getByRole('button', { name: 'Pix' }).click()
  await page.getByRole('button', { name: /^Gerar pagamento$/ }).click()
  await expect(page.getByText('Pix gerado')).toBeVisible()
  await expect(page.getByAltText('QR Code Pix do pedido')).toBeVisible()
  await page.getByRole('link', { name: 'Ver pedido pendente' }).click()
  await expect(page).toHaveURL(/\/orders\/\d+/)
  await expect(page.getByRole('heading', { name: /Pedido #\d+/ })).toBeVisible()
  await expect(page.getByText('Pagamento via Pix')).toBeVisible()
})
