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

test('ops sql: executa SELECT e UPDATE em ambiente de teste', async () => {
  const { app } = createTestContext(false)
  const owner = await signInOwner(app)

  const selectRes = await owner
    .post('/api/owner/ops/db/sql')
    .send({ sql: 'SELECT 1 AS ok' })

  assert.equal(selectRes.status, 200)
  assert.equal(String(selectRes.body.command || '').toUpperCase(), 'SELECT')
  assert.equal(Number(selectRes.body.rows?.[0]?.ok || 0), 1)

  const updateRes = await owner
    .post('/api/owner/ops/db/sql')
    .send({ sql: "UPDATE roles SET name = name WHERE code = 'owner'" })

  assert.equal(updateRes.status, 200)
  assert.equal(String(updateRes.body.command || '').toUpperCase(), 'UPDATE')
})

test('ops sql: registra auditoria de execução', async () => {
  const { app } = createTestContext(false)
  const owner = await signInOwner(app)

  const run = await owner.post('/api/owner/ops/db/sql').send({ sql: 'SELECT NOW() AS now' })
  assert.equal(run.status, 200)

  const logs = await owner.get('/api/owner/audit-logs?limit=50')
  assert.equal(logs.status, 200)
  const found = (logs.body.items || []).find((item) => item.actionType === 'ops_sql_execute')
  assert.ok(found, 'esperava encontrar log ops_sql_execute')
})

