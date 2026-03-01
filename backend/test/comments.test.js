const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('comments: validacao, criacao e summary real', async () => {
  const { app } = createTestContext(false)
  const ownerAgent = request.agent(app)
  const customerAgent = request.agent(app)

  const ownerSignin = await ownerAgent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(ownerSignin.status, 200)

  const createProduct = await ownerAgent.post('/api/owner/products').send({
    name: 'Produto Comentario QA',
    sku: `COM-QA-${Date.now()}`,
    manufacturer: 'QA',
    category: 'Teste',
    bikeModel: 'CG 160',
    price: 69.9,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
    description: 'Produto para validar reviews reais.',
    isActive: true,
  })
  assert.equal(createProduct.status, 201)
  const productId = Number(createProduct.body.item.id)

  const signup = await customerAgent.post('/api/auth/signup').send({
    name: 'Cliente Comentario',
    email: `comment_${Date.now()}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)

  const before = await customerAgent.get('/api/comments?limit=5')
  assert.equal(before.status, 200)
  const previousTotal = Number(before.body.summary.totalReviews)

  const noPurchase = await customerAgent.post('/api/comments').send({
    productId,
    rating: 5,
    message: 'Teste sem compra deve falhar.',
  })
  assert.equal(noPurchase.status, 403)

  await customerAgent.post('/api/bag/items').send({ productId, quantity: 1 })
  const checkout = await customerAgent.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)

  const invalid = await customerAgent.post('/api/comments').send({
    productId,
    rating: 6,
    message: 'Mensagem invalida',
  })
  assert.equal(invalid.status, 400)

  const message = `Comentario QA ${Date.now()} vinculado ao produto.` 
  const created = await customerAgent.post('/api/comments').send({
    productId,
    rating: 5,
    message,
  })
  assert.equal(created.status, 201)
  assert.equal(Number(created.body.item.productId), productId)

  const after = await customerAgent.get(`/api/comments?limit=10&productId=${productId}`)
  assert.equal(after.status, 200)
  assert.ok(after.body.items.some((item) => String(item.message).includes(message)))
  assert.ok(Number(after.body.summaryByProduct.totalReviews) >= 1)
  assert.ok(Number(after.body.summary.totalReviews) >= previousTotal + 1)
})
