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

test('ops auth: guest bloqueado e owner autenticado acessa painel', async () => {
  const { app } = createTestContext(false)

  const guestOps = await request(app).get('/ops')
  assert.equal(guestOps.status, 401)

  const guestApi = await request(app).get('/api/owner/ops/requests')
  assert.equal(guestApi.status, 401)

  const owner = await signInOwner(app)
  const html = await owner.get('/ops')
  assert.equal(html.status, 200)
  assert.ok(String(html.headers['content-type'] || '').includes('text/html'))
  assert.match(String(html.text || ''), /Rodando Ops Console/i)

  const requests = await owner.get('/api/owner/ops/requests')
  assert.equal(requests.status, 200)
  assert.ok(Array.isArray(requests.body.items))
})

