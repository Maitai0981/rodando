const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('reset non-user: preserva usuarios/papeis e recria catalogo base', async () => {
  const { app } = createTestContext(false)
  const { queryOne, resetNonUserData } = require('../src/db')

  const usersBefore = await queryOne('SELECT COUNT(*)::int AS total FROM users')
  const rolesBefore = await queryOne('SELECT COUNT(*)::int AS total FROM roles')
  const userRolesBefore = await queryOne('SELECT COUNT(*)::int AS total FROM user_roles')

  const owner = request.agent(app)
  const ownerSignin = await owner.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(ownerSignin.status, 200)

  const createdProduct = await owner.post('/api/owner/products').send({
    name: `Produto Reset ${Date.now()}`,
    sku: `RST-${Date.now()}`,
    manufacturer: 'Reset QA',
    category: 'Reset',
    bikeModel: 'CG 160',
    price: 77.9,
    cost: 31.2,
    stock: 11,
    minimumStock: 4,
    reorderPoint: 8,
    imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
    description: 'Produto para validar reset non-user.',
    isActive: true,
  })
  assert.equal(createdProduct.status, 201)
  const productId = Number(createdProduct.body.item.id)

  const createdOffer = await owner.post('/api/owner/offers').send({
    productId,
    badge: 'Reset',
    description: 'Oferta para gerar dado operacional',
    compareAtPrice: 99.9,
    isActive: true,
  })
  assert.equal(createdOffer.status, 201)

  const customer = request.agent(app)
  const suffix = Date.now()
  const signup = await customer.post('/api/auth/signup').send({
    name: 'Cliente Reset',
    email: `cliente_reset_${suffix}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)

  const addBag = await customer.post('/api/bag/items').send({ productId, quantity: 1 })
  assert.equal(addBag.status, 201)

  const checkout = await customer.post('/api/orders/checkout').send({})
  assert.equal(checkout.status, 201)

  const comment = await customer.post('/api/comments').send({
    productId,
    rating: 5,
    message: 'Review para reset non-user',
  })
  assert.equal(comment.status, 201)

  const usersBeforeReset = await queryOne('SELECT COUNT(*)::int AS total FROM users')
  const rolesBeforeReset = await queryOne('SELECT COUNT(*)::int AS total FROM roles')
  const userRolesBeforeReset = await queryOne('SELECT COUNT(*)::int AS total FROM user_roles')

  await resetNonUserData({ reseedBase: true })

  const usersAfter = await queryOne('SELECT COUNT(*)::int AS total FROM users')
  const rolesAfter = await queryOne('SELECT COUNT(*)::int AS total FROM roles')
  const userRolesAfter = await queryOne('SELECT COUNT(*)::int AS total FROM user_roles')
  const productsAfter = await queryOne('SELECT COUNT(*)::int AS total FROM products')
  const offersAfter = await queryOne('SELECT COUNT(*)::int AS total FROM offers')
  const ordersAfter = await queryOne('SELECT COUNT(*)::int AS total FROM orders')
  const reviewsAfter = await queryOne('SELECT COUNT(*)::int AS total FROM reviews')
  const eventsAfter = await queryOne('SELECT COUNT(*)::int AS total FROM product_events')
  const sessionsAfter = await queryOne('SELECT COUNT(*)::int AS total FROM sessions')

  assert.ok(Number(usersBeforeReset?.total || 0) >= Number(usersBefore?.total || 0))
  assert.equal(Number(usersAfter?.total || 0), Number(usersBeforeReset?.total || 0))
  assert.equal(Number(rolesAfter?.total || 0), Number(rolesBeforeReset?.total || 0))
  assert.ok(Number(rolesBeforeReset?.total || 0) >= Number(rolesBefore?.total || 0))
  assert.equal(Number(userRolesAfter?.total || 0), Number(userRolesBeforeReset?.total || 0))
  assert.ok(Number(userRolesBeforeReset?.total || 0) >= Number(userRolesBefore?.total || 0))
  assert.ok(Number(productsAfter?.total || 0) > 0)
  assert.equal(Number(offersAfter?.total || 0), 0)
  assert.equal(Number(ordersAfter?.total || 0), 0)
  assert.equal(Number(reviewsAfter?.total || 0), 0)
  assert.equal(Number(eventsAfter?.total || 0), 0)
  assert.equal(Number(sessionsAfter?.total || 0), 0)
})
