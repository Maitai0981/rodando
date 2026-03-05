const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

async function signinOwner(app) {
  const ownerAgent = request.agent(app)
  const signin = await ownerAgent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)
  return ownerAgent
}

async function createProductForCheckout(app) {
  const ownerAgent = await signinOwner(app)
  const created = await ownerAgent.post('/api/owner/products').send({
    name: 'Produto Reliability',
    sku: `REL-${Date.now()}`,
    manufacturer: 'Rodando QA',
    category: 'Confiabilidade',
    bikeModel: 'CG 160',
    price: 149.9,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    description: 'Produto criado para testes de confiabilidade.',
    isActive: true,
  })
  assert.equal(created.status, 201)
  return Number(created.body.item.id)
}

async function signupCustomer(app) {
  const customerAgent = request.agent(app)
  const signup = await customerAgent.post('/api/auth/signup').send({
    name: 'Cliente Reliability',
    email: `customer_reliability_${Date.now()}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)
  return customerAgent
}

test('reliability: /api/ready reporta status de prontidao com checks principais', async () => {
  const { app } = createTestContext(false)
  const response = await request(app).get('/api/ready')
  assert.equal(response.status, 200)
  assert.equal(response.body.status, 'ready')
  assert.equal(response.body.checks.environment.status, 'ok')
  assert.equal(response.body.checks.database.status, 'ok')
  assert.ok(['ok', 'degraded'].includes(response.body.checks.outbox.status))
})

test('reliability: checkout idempotente evita duplicacao e detecta conflito de payload', async () => {
  const { app } = createTestContext(false)
  const productId = await createProductForCheckout(app)
  const customerAgent = await signupCustomer(app)

  const add = await customerAgent.post('/api/bag/items').send({ productId, quantity: 1 })
  assert.equal(add.status, 201)

  const idempotencyKey = `checkout-${Date.now()}-abcd`
  const first = await customerAgent
    .post('/api/orders/checkout')
    .set('Idempotency-Key', idempotencyKey)
    .send({ deliveryMethod: 'pickup' })

  assert.equal(first.status, 201)
  const firstOrderId = Number(first.body.order.id)
  assert.ok(firstOrderId > 0)

  const replay = await customerAgent
    .post('/api/orders/checkout')
    .set('Idempotency-Key', idempotencyKey)
    .send({ deliveryMethod: 'pickup' })

  assert.equal(replay.status, 201)
  assert.equal(String(replay.headers['idempotent-replay'] || '').toLowerCase(), 'true')
  assert.equal(Number(replay.body.order.id), firstOrderId)

  const conflict = await customerAgent
    .post('/api/orders/checkout')
    .set('Idempotency-Key', idempotencyKey)
    .send({ deliveryMethod: 'delivery' })

  assert.equal(conflict.status, 409)
  assert.match(String(conflict.body.error || ''), /payload diferente/i)

  const orders = await customerAgent.get('/api/orders')
  assert.equal(orders.status, 200)
  const createdOrderIds = orders.body.items.map((item) => Number(item.id))
  assert.equal(createdOrderIds.filter((id) => id === firstOrderId).length, 1)
})

test('reliability: webhook deduplicado nao reprocessa evento repetido', async () => {
  const { app } = createTestContext(false)
  const productId = await createProductForCheckout(app)
  const customerAgent = await signupCustomer(app)

  const add = await customerAgent.post('/api/bag/items').send({ productId, quantity: 1 })
  assert.equal(add.status, 201)

  const checkout = await customerAgent.post('/api/orders/checkout').send({ deliveryMethod: 'pickup' })
  assert.equal(checkout.status, 201)
  const orderId = Number(checkout.body.order.id)
  const paymentExternalId = String(checkout.body.payment.externalId || '').trim()
  assert.ok(paymentExternalId.length > 0)

  const payload = {
    id: `evt-${Date.now()}`,
    paymentExternalId,
    status: 'approved',
  }

  const firstWebhook = await request(app).post('/api/payments/webhooks/mercadopago').send(payload)
  assert.equal(firstWebhook.status, 200)
  assert.equal(Boolean(firstWebhook.body.ok), true)

  const secondWebhook = await request(app).post('/api/payments/webhooks/mercadopago').send(payload)
  assert.equal(secondWebhook.status, 200)
  assert.equal(Boolean(secondWebhook.body.deduplicated), true)

  const order = await customerAgent.get(`/api/orders/${orderId}`)
  assert.equal(order.status, 200)
  assert.equal(order.body.item.paymentStatus, 'paid')
})

