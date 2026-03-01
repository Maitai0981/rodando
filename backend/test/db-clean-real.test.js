const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('clean real data: remove operacionais/fake e preserva usuarios reais', async () => {
  const { app } = createTestContext(true)
  const { queryOne, cleanRealData } = require('../src/db')

  const owner = request.agent(app)
  const ownerSignin = await owner.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(ownerSignin.status, 200)

  const createdProduct = await owner.post('/api/owner/products').send({
    name: `Produto Clean ${Date.now()}`,
    sku: `CLN-${Date.now()}`,
    manufacturer: 'Clean QA',
    category: 'Clean',
    bikeModel: 'CG 160',
    price: 88.9,
    cost: 42,
    stock: 6,
    minimumStock: 2,
    reorderPoint: 4,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Produto para validar limpeza real.',
    isActive: true,
  })
  assert.equal(createdProduct.status, 201)
  const productId = Number(createdProduct.body.item.id)
  assert.ok(productId > 0)

  const createdOffer = await owner.post('/api/owner/offers').send({
    productId,
    badge: 'Oferta Clean',
    description: 'Oferta para gerar dado operacional.',
    compareAtPrice: 99.9,
    isActive: true,
  })
  assert.equal(createdOffer.status, 201)

  const realCustomer = request.agent(app)
  const realCustomerEmail = `cliente_real_${Date.now()}@example.com`
  const signup = await realCustomer.post('/api/auth/signup').send({
    name: 'Cliente Real',
    email: realCustomerEmail,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)

  await realCustomer.post('/api/bag/items').send({ productId, quantity: 1 })
  const checkout = await realCustomer.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)

  const comment = await realCustomer.post('/api/comments').send({
    productId,
    rating: 5,
    message: 'Review real para validar limpeza.',
  })
  assert.equal(comment.status, 201)

  const demoUsersBefore = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM users
     WHERE lower(email) IN ('cliente_demo@rodando.local', 'owner_e2e@rodando.local')
       OR (lower(email) LIKE '%_e2e_%@rodando.local')`,
  )
  assert.ok(Number(demoUsersBefore?.total || 0) >= 1)

  const result = await cleanRealData()
  assert.ok(Number(result?.removedDemoUsers || 0) >= 1)

  const usersRealAfter = await queryOne('SELECT COUNT(*)::int AS total FROM users WHERE lower(email) = lower($1)', [realCustomerEmail])
  const demoUsersAfter = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM users
     WHERE lower(email) IN ('cliente_demo@rodando.local', 'owner_e2e@rodando.local')
       OR (lower(email) LIKE '%_e2e_%@rodando.local')`,
  )

  assert.equal(Number(usersRealAfter?.total || 0), 1)
  assert.equal(Number(demoUsersAfter?.total || 0), 0)

  assert.equal(Number(result.counts.products || 0), 0)
  assert.equal(Number(result.counts.offers || 0), 0)
  assert.equal(Number(result.counts.reviews || 0), 0)
  assert.equal(Number(result.counts.orders || 0), 0)
  assert.equal(Number(result.counts.carts || 0), 0)
  assert.equal(Number(result.counts.product_events || 0), 0)
  assert.equal(Number(result.counts.owner_audit_logs || 0), 0)
})
