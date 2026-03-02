const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/rodando_test'
process.env.DB_RESET = '1'
process.env.SEED_BASE_CATALOG = '0'
process.env.SEED_DEMO_DATA = '0'
process.env.OWNER_SEED_EMAIL = process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local'
process.env.OWNER_SEED_PASSWORD = process.env.OWNER_SEED_PASSWORD || '123456'
process.env.OWNER_SEED_NAME = process.env.OWNER_SEED_NAME || 'Owner Test'

const { app } = require('../src/server')

async function ensureOwner(agent) {
  const signin = await agent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL,
    password: process.env.OWNER_SEED_PASSWORD,
  })
  assert.equal(signin.status, 200)
  assert.equal(signin.body.user.role, 'owner')
}

async function createOwnerProduct(agent, suffix) {
  const created = await agent.post('/api/owner/products').send({
    name: `Produto Delete Teste ${suffix}`,
    sku: `DEL-${suffix}`,
    manufacturer: 'QA',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 149.9,
    cost: 80,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Produto criado para teste de exclusao.',
    isActive: true,
  })
  assert.equal(created.status, 201)
  return Number(created.body.item.id)
}

test('DELETE owner products: bloqueia hard delete com pedidos e permite arquivar', async () => {
  const ownerAgent = request.agent(app)
  const customerAgent = request.agent(app)
  await ensureOwner(ownerAgent)

  const suffix = Date.now()
  const productId = await createOwnerProduct(ownerAgent, suffix)

  const offer = await ownerAgent.post('/api/owner/offers').send({
    productId,
    badge: 'Oferta QA',
    description: 'Oferta para validar arquivamento.',
    compareAtPrice: 199.9,
    isActive: true,
  })
  assert.equal(offer.status, 201)

  const signup = await customerAgent.post('/api/auth/signup').send({
    name: 'Cliente Delete Test',
    email: `customer_delete_${suffix}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)

  const addToBag = await customerAgent.post('/api/bag/items').send({
    productId,
    quantity: 1,
  })
  assert.equal(addToBag.status, 201)

  const checkout = await customerAgent.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)

  const hardDelete = await ownerAgent.delete(`/api/owner/products/${productId}?mode=hard`)
  assert.equal(hardDelete.status, 409)
  assert.equal(hardDelete.body.code, 'PRODUCT_HAS_ORDERS')
  assert.equal(hardDelete.body.canArchive, true)

  const archive = await ownerAgent.delete(`/api/owner/products/${productId}?mode=archive`)
  assert.equal(archive.status, 200)
  assert.equal(Boolean(archive.body.item.isActive), false)

  const ownerOffers = await ownerAgent.get('/api/owner/offers')
  assert.equal(ownerOffers.status, 200)
  const archivedOffer = ownerOffers.body.items.find((item) => Number(item.productId) === productId)
  assert.ok(archivedOffer)
  assert.equal(Boolean(archivedOffer.isActive), false)
})

test('DELETE owner products: permite hard delete sem pedidos', async () => {
  const ownerAgent = request.agent(app)
  await ensureOwner(ownerAgent)

  const productId = await createOwnerProduct(ownerAgent, `${Date.now()}-clean`)
  const hardDelete = await ownerAgent.delete(`/api/owner/products/${productId}?mode=hard`)
  assert.equal(hardDelete.status, 204)

  const fetchDeleted = await ownerAgent.get(`/api/owner/products/${productId}`)
  assert.equal(fetchDeleted.status, 404)
})
