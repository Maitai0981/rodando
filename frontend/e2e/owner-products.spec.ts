import { expect, test } from '@playwright/test'
import { API_BASE, ensureOwnerSession, resetE2EData } from './helpers/session'

test.afterEach(async ({ request }) => {
  await resetE2EData(request)
})

test('owner products: bloqueia publicacao sem imagem', async ({ page }) => {
  const suffix = Date.now()

  await ensureOwnerSession(page.request)

  await page.goto('/owner/products/new')

  await page.getByTestId('owner-product-name').fill('Produto Owner E2E')
  await page.getByTestId('owner-product-sku').fill(`OWN-${suffix}`)
  await page.getByTestId('owner-product-manufacturer').fill('Fabricante QA')
  await page.getByTestId('owner-product-category').fill('Categoria QA')
  await page.getByTestId('owner-product-bike-model').fill('CG 160')
  await page.getByTestId('owner-product-price').fill('49.9')
  await page.getByTestId('owner-product-cost').fill('30')
  await page.getByTestId('owner-product-stock').fill('5')
  await page.getByTestId('owner-product-description').fill('Teste owner sem imagem')

  await page.getByTestId('owner-product-save-button').click()
  await expect(page.getByText(/produto ativo precisa ter imagem principal valida/i)).toBeVisible()
})

test('owner products: exclusao definitiva bloqueada para produto com pedidos e permite arquivar', async ({ page }) => {
  const suffix = Date.now()
  const customerEmail = `customer_e2e_${suffix}@rodando.local`

  await ensureOwnerSession(page.request)

  const createProduct = await page.request.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: `Produto vendido E2E ${suffix}`,
      sku: `VND-${suffix}`,
      manufacturer: 'Fabricante QA',
      category: 'Categoria QA',
      bikeModel: 'CG 160',
      price: 149.9,
      cost: 80,
      stock: 11,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Produto com venda para validar bloqueio de exclusao.',
      isActive: true,
    },
  })
  expect(createProduct.ok()).toBeTruthy()
  const createdPayload = await createProduct.json()
  const productId = Number(createdPayload.item.id)

  const signup = await page.request.post(`${API_BASE}/api/auth/signup`, {
    data: {
      name: 'Cliente E2E',
      email: customerEmail,
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    },
  })
  expect(signup.ok()).toBeTruthy()

  const addToBag = await page.request.post(`${API_BASE}/api/bag/items`, {
    data: {
      productId,
      quantity: 1,
    },
  })
  expect(addToBag.ok()).toBeTruthy()
  const checkout = await page.request.post(`${API_BASE}/api/orders/checkout`, { data: {} })
  expect(checkout.ok()).toBeTruthy()

  await ensureOwnerSession(page.request)
  await page.goto('/owner/products')
  await page.getByTestId(`owner-delete-${productId}`).click()
  await page.getByTestId('owner-delete-hard-button').click()
  await expect(page.getByText(/nao pode ser excluido definitivamente/i)).toBeVisible()

  await page.getByTestId('owner-delete-archive-button').click()
  await expect(page.getByText('Produto arquivado com sucesso.')).toBeVisible()

  const ownerProduct = await page.request.get(`${API_BASE}/api/owner/products/${productId}`)
  expect(ownerProduct.ok()).toBeTruthy()
  const ownerProductPayload = await ownerProduct.json()
  expect(Boolean(ownerProductPayload?.item?.isActive)).toBeFalsy()
})

test('owner products: exclui definitivamente produto sem pedidos', async ({ page }) => {
  const suffix = Date.now()

  await ensureOwnerSession(page.request)

  const createProduct = await page.request.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: `Produto sem venda E2E ${suffix}`,
      sku: `DEL-${suffix}`,
      manufacturer: 'Fabricante QA',
      category: 'Categoria QA',
      bikeModel: 'CG 160',
      price: 119.9,
      cost: 65,
      stock: 9,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Produto sem pedidos para hard delete.',
      isActive: true,
    },
  })
  expect(createProduct.ok()).toBeTruthy()
  const createdPayload = await createProduct.json()
  const productId = Number(createdPayload.item.id)

  await page.goto('/owner/products')
  await page.getByTestId(`owner-delete-${productId}`).click()
  await page.getByTestId('owner-delete-hard-button').click()
  await expect(page.getByText('Produto excluido com sucesso.')).toBeVisible()

  const ownerProduct = await page.request.get(`${API_BASE}/api/owner/products/${productId}`)
  expect(ownerProduct.status()).toBe(404)
})
