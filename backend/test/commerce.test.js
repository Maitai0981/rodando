const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

async function setupProduct(app) {
  const ownerAgent = request.agent(app)
  const ownerSignin = await ownerAgent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(ownerSignin.status, 200)

  const created = await ownerAgent.post('/api/owner/products').send({
    name: 'Camera Comercial QA',
    sku: `COM-${Date.now()}`,
    manufacturer: 'Rodando QA',
    category: 'Camera',
    bikeModel: 'XRE 190',
    price: 59.9,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    description: 'Produto para fluxo de compra',
    isActive: true,
  })
  assert.equal(created.status, 201)
  return Number(created.body.item.id)
}

test('commerce: mochila, checkout e pedidos', async () => {
  const { app } = createTestContext(false)
  const productId = await setupProduct(app)

  const customerAgent = request.agent(app)
  const signup = await customerAgent.post('/api/auth/signup').send({
    name: 'Cliente Commerce',
    email: `customer_commerce_${Date.now()}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)

  const add = await customerAgent.post('/api/bag/items').send({ productId, quantity: 2 })
  assert.equal(add.status, 201)

  const bag = await customerAgent.get('/api/bag')
  assert.equal(bag.status, 200)
  assert.equal(bag.body.items.length, 1)

  const checkout = await customerAgent.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)
  assert.ok(Number(checkout.body.order.id) > 0)

  const bagAfter = await customerAgent.get('/api/bag')
  assert.equal(bagAfter.status, 200)
  assert.equal(bagAfter.body.items.length, 0)

  const orders = await customerAgent.get('/api/orders')
  assert.equal(orders.status, 200)
  assert.ok(orders.body.items.length >= 1)
})
