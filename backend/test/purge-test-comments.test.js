const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('db purge: remove somente reviews ligadas a usuarios de teste/e2e', async () => {
  const { app } = createTestContext(false)
  const ownerAgent = request.agent(app)
  const customerAgent = request.agent(app)
  const db = require('../src/db')

  const ownerSignin = await ownerAgent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(ownerSignin.status, 200)

  const createProduct = await ownerAgent.post('/api/owner/products').send({
    name: 'Produto Purge Review',
    sku: `PURGE-${Date.now()}`,
    manufacturer: 'QA',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 59.9,
    stock: 11,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    description: 'Produto para teste de purge seletivo.',
    isActive: true,
  })
  assert.equal(createProduct.status, 201)
  const productId = Number(createProduct.body.item.id)

  const signup = await customerAgent.post('/api/auth/signup').send({
    name: 'Customer E2E Purge',
    email: `customer_e2e_${Date.now()}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)

  await customerAgent.post('/api/bag/items').send({ productId, quantity: 1 })
  const checkout = await customerAgent.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)

  const createReview = await customerAgent.post('/api/comments').send({
    productId,
    rating: 5,
    message: 'Comentario e2e para teste de purge seletivo.',
  })
  assert.equal(createReview.status, 201)

  const before = await db.queryOne(
    `SELECT COUNT(*)::int AS total
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE lower(u.email) LIKE 'customer_e2e_%@rodando.local'`,
  )
  assert.ok(Number(before?.total || 0) >= 1)

  const purged = await db.purgeTestComments()
  assert.ok(Number(purged?.removed || 0) >= 1)

  const after = await db.queryOne(
    `SELECT COUNT(*)::int AS total
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE lower(u.email) LIKE 'customer_e2e_%@rodando.local'`,
  )
  assert.equal(Number(after?.total || 0), 0)
})

