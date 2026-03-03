const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('owner: guard de permissao e regra de imagem para publicacao', async () => {
  const { app } = createTestContext(false)
  const guest = request.agent(app)

  const denied = await guest.get('/api/owner/products')
  assert.equal(denied.status, 401)

  const owner = request.agent(app)
  const signin = await owner.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)

  const invalidPublish = await owner.post('/api/owner/products').send({
    name: 'Produto Sem Imagem',
    sku: `NOIMG-${Date.now()}`,
    manufacturer: 'QA',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 10,
    stock: 5,
    imageUrl: '',
    description: 'Nao deve publicar sem imagem',
    isActive: true,
  })
  assert.equal(invalidPublish.status, 400)

  const createDraft = await owner.post('/api/owner/products').send({
    name: 'Produto Draft',
    sku: `DRAFT-${Date.now()}`,
    manufacturer: 'QA',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 10,
    stock: 5,
    imageUrl: '',
    description: 'Rascunho sem imagem',
    isActive: false,
  })
  assert.equal(createDraft.status, 201)

  const publishWithoutImage = await owner.put(`/api/owner/products/${createDraft.body.item.id}`).send({
    ...createDraft.body.item,
    imageUrl: '',
    isActive: true,
  })
  assert.equal(publishWithoutImage.status, 400)
})

test('owner: upload local de imagem exige owner e retorna URL publica', async () => {
  const { app } = createTestContext(false)
  const guest = request.agent(app)
  const denied = await guest.post('/api/owner/uploads').attach('image', Buffer.from('fake-jpg'), 'sample.jpg')
  assert.equal(denied.status, 401)

  const owner = request.agent(app)
  const signin = await owner.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)

  const invalid = await owner.post('/api/owner/uploads').attach('image', Buffer.from('not-image'), 'sample.txt')
  assert.equal(invalid.status, 400)

  const ok = await owner.post('/api/owner/uploads').attach('image', Buffer.from('fake-jpg-data'), 'sample.jpg')
  assert.equal(ok.status, 201)
  assert.ok(String(ok.body.item.publicUrl || '').includes('/uploads/'))
  assert.equal(String(ok.body.item.mimeType || ''), 'image/jpeg')
})

test('owner: dashboard analitico retorna metricas, ranking e tabela por produto', async () => {
  const { app } = createTestContext(true)
  const owner = request.agent(app)

  const signin = await owner.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)

  const response = await owner.get('/api/owner/dashboard?period=month&status=all&page=1&pageSize=10&sortBy=revenue&direction=desc')
  assert.equal(response.status, 200)
  assert.ok(response.body.metrics)
  assert.ok(response.body.rankings)
  assert.ok(response.body.inventory)
  assert.ok(response.body.funnel)
  assert.ok(response.body.quality)
  assert.ok(response.body.facets)
  assert.ok(response.body.metrics?.metricDelta)
  assert.ok(response.body.products?.meta)
  assert.ok(Array.isArray(response.body.products?.items))

  if (response.body.products.items.length > 0) {
    const sample = response.body.products.items[0]
    assert.ok(typeof sample.sku === 'string')
    assert.ok(typeof sample.name === 'string')
    assert.ok(typeof sample.marginPercent === 'number')
    assert.ok(typeof sample.conversionRate === 'number')
    assert.ok(typeof sample.stock === 'number')
  }
})

test('owner: auditoria registra alteracoes de produto e oferta', async () => {
  const { app } = createTestContext(true)
  const owner = request.agent(app)

  const signin = await owner.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)

  const createProduct = await owner.post('/api/owner/products').send({
    name: 'Produto Auditoria',
    sku: `AUD-${Date.now()}`,
    manufacturer: 'QA',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 44.9,
    cost: 20,
    stock: 15,
    minimumStock: 4,
    reorderPoint: 8,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=800&q=80',
    hoverImageUrl: '',
    description: 'Produto para validar auditoria owner',
    isActive: true,
  })
  assert.equal(createProduct.status, 201)
  const productId = Number(createProduct.body.item.id)
  assert.ok(productId > 0)

  const createOffer = await owner.post('/api/owner/offers').send({
    productId,
    badge: 'Oferta QA',
    description: 'Oferta para teste de auditoria',
    compareAtPrice: 59.9,
    isActive: true,
  })
  assert.equal(createOffer.status, 201)

  const logs = await owner.get('/api/owner/audit-logs?limit=20')
  assert.equal(logs.status, 200)
  assert.ok(Array.isArray(logs.body.items))
  assert.ok(logs.body.items.some((item) => item.actionType === 'product_create' && Number(item.entityId) === productId))
  assert.ok(logs.body.items.some((item) => item.actionType === 'offer_create' && Number(item.entityId) === Number(createOffer.body.item.id)))
})
