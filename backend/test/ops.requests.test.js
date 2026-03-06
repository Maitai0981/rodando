const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

async function signInOwner(app) {
  const agent = request.agent(app)
  const signin = await agent.post('/api/auth/owner/signin').send({
    email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
    password: process.env.OWNER_SEED_PASSWORD || '123456',
  })
  assert.equal(signin.status, 200)
  return agent
}

test('ops requests: retorna historico com payload mascarado', async () => {
  const { app } = createTestContext(false)
  const owner = await signInOwner(app)

  await request(app).post('/api/auth/signin').send({
    email: 'naoexiste@rodando.local',
    password: 'senha-super-secreta',
  })

  const response = await owner.get('/api/owner/ops/requests').query({
    q: '/api/auth/signin',
    limit: 50,
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(response.body.items))
  assert.ok(response.body.meta)

  const signinRequest = response.body.items.find((item) => String(item.path || '').includes('/api/auth/signin'))
  assert.ok(signinRequest, 'deveria encontrar request de signin no buffer')
  assert.equal(signinRequest.bodyMasked?.password, '[redacted]')
})

