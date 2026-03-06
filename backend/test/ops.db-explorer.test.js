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

test('ops db explorer: lista tabelas e preview paginado', async () => {
  const { app } = createTestContext(false)
  const owner = await signInOwner(app)

  const tables = await owner.get('/api/owner/ops/db/tables')
  assert.equal(tables.status, 200)
  assert.ok(Array.isArray(tables.body.items))
  assert.ok(tables.body.items.length > 0)

  const firstTable = String(tables.body.items[0].name || '').trim()
  assert.ok(firstTable.length > 0)

  const preview = await owner
    .get(`/api/owner/ops/db/table/${encodeURIComponent(firstTable)}`)
    .query({ limit: 10, offset: 0, order: 'desc' })

  assert.equal(preview.status, 200)
  assert.equal(preview.body.table, firstTable)
  assert.ok(Array.isArray(preview.body.columns))
  assert.ok(Array.isArray(preview.body.rows))
  assert.ok(preview.body.meta)
})

test('ops db explorer: rejeita nome de tabela invalido', async () => {
  const { app } = createTestContext(false)
  const owner = await signInOwner(app)

  const invalid = await owner.get('/api/owner/ops/db/table/public.users')
  assert.equal(invalid.status, 400)
})

