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

test('catalog: filtros, meta, highlights e recommendations', async () => {
  const { app } = createTestContext(false)
  const ownerAgent = await createOwnerAgent(app)
  const guestAgent = request.agent(app)

  const productSku = `CAT-${Date.now()}`
  const create = await ownerAgent.post('/api/owner/products').send({
    name: 'Pneu Pro Catalog',
    sku: productSku,
    manufacturer: 'Factory QA',
    category: 'Pneu',
    bikeModel: 'CG 160',
    price: 129.9,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Pneu para testes de catalogo.',
    isActive: true,
  })
  assert.equal(create.status, 201)
  const productId = Number(create.body.item.id)

  const createOffer = await ownerAgent.post('/api/owner/offers').send({
    productId,
    badge: 'Mais vendido',
    description: 'Oferta ativa de teste',
    compareAtPrice: 159.9,
    isActive: true,
  })
  assert.equal(createOffer.status, 201)

  const products = await guestAgent.get('/api/products?q=pneu&manufacturer=factory qa&inStock=true&sort=discount-desc&page=1&pageSize=6')
  assert.equal(products.status, 200)
  assert.ok(Array.isArray(products.body.items))
  assert.ok(products.body.items.length >= 1)
  assert.ok(products.body.items.some((item) => Number(item.id) === productId))
  assert.equal(typeof products.body.meta.total, 'number')
  assert.equal(typeof products.body.meta.totalPages, 'number')

  const highlights = await guestAgent.get('/api/catalog/highlights')
  assert.equal(highlights.status, 200)
  assert.ok(highlights.body.items.some((item) => Number(item.id) === productId))

  const recs = await guestAgent.get(`/api/catalog/recommendations?exclude=${productId}&limit=4`)
  assert.equal(recs.status, 200)
  assert.ok(recs.body.items.every((item) => Number(item.id) !== productId))

  const details = await guestAgent.get(`/api/products/${productId}`)
  assert.equal(details.status, 200)
  assert.equal(Number(details.body?.item?.id), productId)
  assert.ok(details.body?.gallery)
  assert.ok(details.body?.pricing)
  assert.ok(details.body?.availability)
  assert.ok(details.body?.compatibility)
  assert.ok(details.body?.seo)
  assert.ok(details.body?.socialProof)

  const missing = await guestAgent.get('/api/products/99999999')
  assert.equal(missing.status, 404)

  const inactiveSku = `CAT-INACTIVE-${Date.now()}`
  const inactiveCreate = await ownerAgent.post('/api/owner/products').send({
    name: 'Produto Inativo Catalog',
    sku: inactiveSku,
    manufacturer: 'Factory QA',
    category: 'Pneu',
    bikeModel: 'CG 160',
    price: 79.9,
    stock: 2,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Produto inativo para teste de PDP.',
    isActive: false,
  })
  assert.equal(inactiveCreate.status, 201)
  const inactiveProductId = Number(inactiveCreate.body.item.id)

  const inactiveDetails = await guestAgent.get(`/api/products/${inactiveProductId}`)
  assert.equal(inactiveDetails.status, 404)
})
