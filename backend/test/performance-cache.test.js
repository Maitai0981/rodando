const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

async function createOwnerAgent(app) {
  const ownerAgent = request.agent(app)
  const signin = await ownerAgent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)
  return ownerAgent
}

async function createPublicProduct(ownerAgent, suffix) {
  const create = await ownerAgent.post('/api/owner/products').send({
    name: `Produto Cache ${suffix}`,
    sku: `CACHE-${suffix}`,
    manufacturer: 'QA Cache',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 159.9,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Produto para validar cache publico.',
    isActive: true,
  })
  assert.equal(create.status, 201)
  return Number(create.body.item.id)
}

test('performance cache: endpoints publicos retornam cache headers e metricas', async () => {
  const { app } = createTestContext(false)
  const ownerAgent = await createOwnerAgent(app)
  const guestAgent = request.agent(app)

  const productId = await createPublicProduct(ownerAgent, Date.now())

  const listFirst = await guestAgent.get('/api/products?page=1&pageSize=6&sort=name-asc')
  assert.equal(listFirst.status, 200)
  assert.match(String(listFirst.headers['cache-control'] || ''), /public/i)
  assert.equal(listFirst.headers['x-cache'], 'MISS')

  const listSecond = await guestAgent.get('/api/products?page=1&pageSize=6&sort=name-asc')
  assert.equal(listSecond.status, 200)
  assert.equal(listSecond.headers['x-cache'], 'HIT')

  const detailsFirst = await guestAgent.get(`/api/products/${productId}`)
  assert.equal(detailsFirst.status, 200)
  assert.equal(detailsFirst.headers['x-cache'], 'MISS')

  const detailsSecond = await guestAgent.get(`/api/products/${productId}`)
  assert.equal(detailsSecond.status, 200)
  assert.equal(detailsSecond.headers['x-cache'], 'HIT')

  const metrics = await guestAgent.get('/api/metrics')
  assert.equal(metrics.status, 200)
  assert.equal(metrics.body?.status, 'ok')
  assert.equal(typeof metrics.body?.requests?.total, 'number')
  assert.equal(typeof metrics.body?.cache?.hits, 'number')
  assert.equal(typeof metrics.body?.cache?.misses, 'number')
  assert.ok(Number(metrics.body?.cache?.hits || 0) >= 1)
})

test('performance cache: mutacao invalida cache publico de produtos', async () => {
  const { app } = createTestContext(false)
  const ownerAgent = await createOwnerAgent(app)
  const guestAgent = request.agent(app)

  const productId = await createPublicProduct(ownerAgent, Date.now() + 1)

  const first = await guestAgent.get('/api/products?page=1&pageSize=6&sort=name-asc')
  assert.equal(first.status, 200)
  assert.equal(first.headers['x-cache'], 'MISS')

  const second = await guestAgent.get('/api/products?page=1&pageSize=6&sort=name-asc')
  assert.equal(second.status, 200)
  assert.equal(second.headers['x-cache'], 'HIT')

  const offerCreate = await ownerAgent.post('/api/owner/offers').send({
    productId,
    badge: 'Oferta cache',
    description: 'Oferta para forcar invalidacao de cache.',
    compareAtPrice: 199.9,
    isActive: true,
  })
  assert.equal(offerCreate.status, 201)

  const afterMutation = await guestAgent.get('/api/products?page=1&pageSize=6&sort=name-asc')
  assert.equal(afterMutation.status, 200)
  assert.equal(afterMutation.headers['x-cache'], 'MISS')
})
