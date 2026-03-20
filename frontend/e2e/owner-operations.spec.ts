import { expect, test } from '@playwright/test'
import { API_BASE, OWNER_CREDENTIALS, ensureOwnerSession, resetE2EData } from './helpers/session'

test.afterEach(async ({ request }) => {
  await resetE2EData(request)
})

test('owner login, dashboard, products, orders e settings seguem operacionais', async ({ page, request }) => {
  const suffix = Date.now()

  await ensureOwnerSession(request)
  const createdProduct = await request.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: `Produto Owner ${suffix}`,
      sku: `OWN-${suffix}`,
      manufacturer: 'QA Owner',
      category: 'Teste',
      bikeModel: 'CG 160',
      price: 229.9,
      cost: 110,
      stock: 9,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
      description: 'Produto criado para validar as telas owner.',
      isActive: true,
    },
  })
  expect(createdProduct.ok()).toBeTruthy()
  const productPayload = await createdProduct.json()
  const productId = Number(productPayload?.item?.id)

  const customerEmail = `customer_e2e_${suffix}@rodando.local`
  const signup = await request.post(`${API_BASE}/api/auth/signup`, {
    data: {
      name: 'Cliente Owner',
      email: customerEmail,
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    },
  })
  expect(signup.ok()).toBeTruthy()
  const addToBag = await request.post(`${API_BASE}/api/bag/items`, {
    data: { productId, quantity: 1 },
  })
  expect(addToBag.ok()).toBeTruthy()
  const checkout = await request.post(`${API_BASE}/api/orders/checkout`, {
    data: {
      deliveryMethod: 'pickup',
      recipientName: 'Cliente Owner',
      paymentMethod: 'card_credit',
    },
  })
  expect(checkout.ok()).toBeTruthy()
  const checkoutPayload = await checkout.json()
  const orderId = Number(checkoutPayload?.order?.id)
  const paymentToken = String(checkoutPayload?.payment?.externalId || '')
  const completion = await request.post(`${API_BASE}/api/payments/mercadopago/complete`, {
    data: { token: paymentToken },
  })
  expect(completion.ok()).toBeTruthy()

  await page.goto('/owner/login')
  await page.getByTestId('owner-signin-email-input').fill(OWNER_CREDENTIALS.email)
  await page.getByTestId('owner-signin-password-input').fill(OWNER_CREDENTIALS.password)
  await page.getByTestId('owner-signin-submit-button').click()
  await expect(page).toHaveURL(/\/owner\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard de produtos' })).toBeVisible()
  await expect(page.getByText(`Produto Owner ${suffix}`)).toBeVisible()

  await page.goto('/owner/products')
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible()
  await page.getByTestId('owner-products-search-input').fill(`Produto Owner ${suffix}`)
  await page.getByTestId('owner-products-search-button').click()
  await expect(page.getByText(`Produto Owner ${suffix}`)).toBeVisible()

  await page.goto('/owner/orders')
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible()
  await page.getByRole('button', { name: 'Detalhes' }).first().click()
  await expect(page.getByText(`Pedido #${orderId}`)).toBeVisible()
  await page.getByLabel('Atualizar status').selectOption('shipped')
  await expect(page.getByText('Status atualizado com sucesso.')).toBeVisible()

  await page.goto('/owner/settings')
  await expect(page.getByRole('heading', { name: 'Configurações do owner' })).toBeVisible()
  await page.getByLabel('Email de alerta').fill('financeiro@rodando.local')
  await page.getByRole('button', { name: 'Salvar configurações' }).click()
  await expect(page.getByText('Configurações salvas com sucesso.')).toBeVisible()
})
