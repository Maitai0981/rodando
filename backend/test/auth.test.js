const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('auth: signup, signin, me e logout', async () => {
  const { app } = createTestContext(false)
  const agent = request.agent(app)

  const invalid = await agent.post('/api/auth/signup').send({ name: 'A', email: 'x', password: '1', cep: '123' })
  assert.equal(invalid.status, 400)

  const invalidCep = await agent.post('/api/auth/signup').send({
    name: 'Cliente Invalido',
    email: `invalid_cep_${Date.now()}@rodando.local`,
    password: '123456',
    cep: '99999',
  })
  assert.equal(invalidCep.status, 400)

  const email = `auth_${Date.now()}@rodando.local`
  const signup = await agent.post('/api/auth/signup').send({
    name: 'Teste Auth',
    email,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  })
  assert.equal(signup.status, 201)
  assert.ok(signup.body.user)
  assert.equal(signup.body.user.role, 'customer')
  assert.equal(signup.body.user.cep, '01001000')
  assert.ok(typeof signup.body.user.addressStreet === 'string')
  assert.ok(typeof signup.body.user.addressCity === 'string')
  assert.ok(typeof signup.body.user.addressState === 'string')

  const meAuth = await agent.get('/api/auth/me')
  assert.equal(meAuth.status, 200)
  assert.equal(meAuth.body.user.email, email)
  assert.equal(meAuth.body.user.cep, '01001000')
  assert.ok(typeof meAuth.body.user.addressCity === 'string')

  const logout = await agent.post('/api/auth/logout').send({})
  assert.equal(logout.status, 200)

  const meAnon = await agent.get('/api/auth/me')
  assert.equal(meAnon.status, 200)
  assert.equal(meAnon.body.user, null)

  const invalidSignin = await agent.post('/api/auth/signin').send({ email, password: 'wrong-password' })
  assert.equal(invalidSignin.status, 401)

  const signin = await agent.post('/api/auth/signin').send({ email, password: '123456' })
  assert.equal(signin.status, 200)
  assert.equal(signin.body.user.email, email)
  assert.equal(signin.body.user.cep, '01001000')

  const ownerSignin = await agent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(ownerSignin.status, 200)
  assert.equal(ownerSignin.body.user.role, 'owner')
})
