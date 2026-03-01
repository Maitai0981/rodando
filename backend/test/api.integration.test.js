const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { performance } = require('node:perf_hooks')
const test = require('node:test')
const request = require('supertest')

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rodando-api-test-'))
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/rodando_test'
process.env.DB_RESET = '1'
process.env.SEED_BASE_CATALOG = '0'
process.env.SEED_DEMO_DATA = '0'
process.env.OWNER_SEED_EMAIL = process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local'
process.env.OWNER_SEED_PASSWORD = process.env.OWNER_SEED_PASSWORD || '123456'
process.env.OWNER_SEED_NAME = process.env.OWNER_SEED_NAME || 'Owner Test'

const { app } = require('../src/server')

function measureMs() {
  return performance.now()
}

test('API funcional e nao funcional: comentarios, ofertas, catalogo, pesquisa, compra e mochila reais', async () => {
  const ownerAgent = request.agent(app)
  const guestAgent = request.agent(app)
  const customerAgent = request.agent(app)

  const customerEmail = `customer_${Date.now()}@rodando.local`

  const health = await guestAgent.get('/api/health')
  assert.equal(health.status, 200)
  assert.equal(health.body.status, 'ok')

  const ownerSignin = await ownerAgent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL,
    password: process.env.OWNER_SEED_PASSWORD,
  })
  assert.equal(ownerSignin.status, 200)
  assert.equal(ownerSignin.body.user.role, 'owner')
  assert.ok(String(ownerSignin.headers['set-cookie'] || '').includes('HttpOnly'))

  const createProduct = await ownerAgent.post('/api/owner/products').send({
    name: 'Pneu QA Road 100/80-17',
    sku: `QA-PNEU-${Date.now()}`,
    manufacturer: 'QA Tires',
    category: 'Pneu',
    bikeModel: 'CG 160',
    price: 189.9,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Produto criado por teste automatizado.',
    isActive: true,
  })
  assert.equal(createProduct.status, 201)
  const productId = Number(createProduct.body.item.id)
  assert.ok(productId > 0)

  const createOffer = await ownerAgent.post('/api/owner/offers').send({
    productId,
    badge: 'Oferta QA',
    description: 'Oferta criada por teste automatizado.',
    compareAtPrice: 239.9,
    isActive: true,
  })
  assert.equal(createOffer.status, 201)
  assert.equal(Number(createOffer.body.item.productId), productId)

  const ownerOffers = await ownerAgent.get('/api/owner/offers')
  assert.equal(ownerOffers.status, 200)
  assert.ok(ownerOffers.body.items.some((item) => Number(item.productId) === productId))

  const products = await guestAgent.get('/api/products?page=1&pageSize=6&sort=name-asc')
  assert.equal(products.status, 200)
  assert.ok(products.body.meta)
  assert.ok(Number(products.body.meta.total) >= 1)
  assert.ok(products.body.items.some((item) => Number(item.id) === productId))

  const searched = await guestAgent.get('/api/products?q=pneu qa road&manufacturer=qa tires&inStock=true&sort=best-sellers&minPrice=100&maxPrice=300')
  assert.equal(searched.status, 200)
  assert.ok(searched.body.items.some((item) => Number(item.id) === productId))
  assert.ok(searched.body.items.every((item) => Number(item.price) >= 100 && Number(item.price) <= 300))
  assert.ok(searched.body.items.every((item) => String(item.manufacturer).toLowerCase() === 'qa tires'))

  const offers = await guestAgent.get('/api/offers')
  assert.equal(offers.status, 200)
  assert.ok(offers.body.items.some((item) => Number(item.productId) === productId))

  const highlights = await guestAgent.get('/api/catalog/highlights')
  assert.equal(highlights.status, 200)
  assert.ok(Array.isArray(highlights.body.items))
  assert.ok(highlights.body.items.some((item) => Number(item.id) === productId))

  const recommendations = await guestAgent.get(`/api/catalog/recommendations?exclude=${productId}&limit=3`)
  assert.equal(recommendations.status, 200)
  assert.ok(Array.isArray(recommendations.body.items))
  assert.ok(recommendations.body.items.every((item) => Number(item.id) !== productId))

  const commentsInitial = await guestAgent.get('/api/comments?limit=5')
  assert.equal(commentsInitial.status, 200)
  assert.ok(Array.isArray(commentsInitial.body.items))
  assert.ok(typeof commentsInitial.body.summary?.averageRating === 'number')
  assert.ok(typeof commentsInitial.body.summary?.totalReviews === 'number')

  const badComment = await guestAgent.post('/api/comments').send({
    productId,
    rating: 9,
    message: 'ok',
  })
  assert.equal(badComment.status, 401)

  const commentWithoutPurchase = await customerAgent.post('/api/comments').send({
    productId,
    rating: 5,
    message: 'Comentario sem compra deve falhar.',
  })
  assert.equal(commentWithoutPurchase.status, 401)

  const addGuestBag = await guestAgent.post('/api/bag/items').send({
    productId,
    quantity: 2,
  })
  assert.equal(addGuestBag.status, 201)

  const guestBag = await guestAgent.get('/api/bag')
  assert.equal(guestBag.status, 200)
  assert.ok(guestBag.body.items.length > 0)

  const customerSignup = await customerAgent.post('/api/auth/signup').send({
    name: 'Cliente QA',
    email: customerEmail,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(customerSignup.status, 201)
  assert.equal(customerSignup.body.user.role, 'customer')

  const customerBagInitial = await customerAgent.get('/api/bag')
  assert.equal(customerBagInitial.status, 200)
  assert.equal(customerBagInitial.body.items.length, 0)

  const addCustomerBag = await customerAgent.post('/api/bag/items').send({
    productId,
    quantity: 1,
  })
  assert.equal(addCustomerBag.status, 201)

  const checkout = await customerAgent.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)
  assert.ok(Number(checkout.body.order.id) > 0)

  const newMessage = `Comentario de teste ${Date.now()}`
  const createComment = await customerAgent.post('/api/comments').send({
    productId,
    rating: 5,
    message: `${newMessage} para validar persistencia.`,
  })
  assert.equal(createComment.status, 201)
  assert.equal(Number(createComment.body.item.productId), productId)

  const commentsAfter = await guestAgent.get(`/api/comments?limit=10&productId=${productId}`)
  assert.equal(commentsAfter.status, 200)
  assert.ok(commentsAfter.body.items.some((item) => String(item.message).includes(newMessage)))
  assert.ok(Number(commentsAfter.body.summaryByProduct?.totalReviews) >= 1)

  const orders = await customerAgent.get('/api/orders')
  assert.equal(orders.status, 200)
  assert.ok(Array.isArray(orders.body.items))
  assert.ok(orders.body.items.length > 0)

  const bagAfterCheckout = await customerAgent.get('/api/bag')
  assert.equal(bagAfterCheckout.status, 200)
  assert.equal(bagAfterCheckout.body.items.length, 0)

  const perfEndpoints = [
    '/api/health',
    '/api/products?page=1&pageSize=10&sort=discount-desc',
    '/api/offers',
    '/api/comments',
    '/api/catalog/highlights',
    '/api/catalog/recommendations?limit=4',
  ]
  for (const endpoint of perfEndpoints) {
    const start = measureMs()
    const response = await guestAgent.get(endpoint)
    const elapsed = measureMs() - start
    assert.equal(response.status, 200)
    assert.ok(elapsed < 850, `Endpoint ${endpoint} excedeu limite de latencia local: ${elapsed.toFixed(2)}ms`)
  }

  const parallelRuns = 20
  const concurrent = await Promise.all(
    Array.from({ length: parallelRuns }, async () => {
      const start = measureMs()
      const response = await request(app).get('/api/products')
      const elapsed = measureMs() - start
      assert.equal(response.status, 200)
      return elapsed
    }),
  )

  const maxMs = Math.max(...concurrent)
  const avgMs = concurrent.reduce((sum, value) => sum + value, 0) / concurrent.length
  assert.ok(maxMs < 1400, `Carga concorrente acima do esperado: max ${maxMs.toFixed(2)}ms`)
  assert.ok(avgMs < 550, `Media de latencia concorrente acima do esperado: ${avgMs.toFixed(2)}ms`)
})
