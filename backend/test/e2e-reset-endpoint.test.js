const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

function resolveBaseDatabaseUrl() {
  return (
    String(process.env.TEST_DATABASE_URL || '').trim() ||
    String(process.env.DATABASE_URL || '').trim() ||
    'postgres://postgres:postgres@127.0.0.1:5432/rodando_test'
  )
}

function withDatabaseName(databaseName) {
  const parsed = new URL(resolveBaseDatabaseUrl())
  parsed.pathname = `/${databaseName}`
  return parsed.toString()
}

function applyEnv(overrides) {
  const previous = {}
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key]
    if (value === undefined || value === null) {
      delete process.env[key]
    } else {
      process.env[key] = String(value)
    }
  }

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('e2e reset endpoint: rejeita token invalido', async () => {
  const restore = applyEnv({
    TEST_DATABASE_URL: withDatabaseName('rodando_reset_invalid_token_e2e'),
    E2E_ALLOW_RESET: '1',
    E2E_RESET_TOKEN: 'token-reset-ok',
  })

  try {
    const { app } = createTestContext(false)
    const response = await request(app).post('/api/test/reset-non-user').set('x-e2e-reset-token', 'token-errado').send({})

    assert.equal(response.status, 401)
    assert.match(String(response.body?.error || ''), /token/i)
  } finally {
    restore()
  }
})

test('e2e reset endpoint: bloqueia quando E2E_ALLOW_RESET nao esta habilitado', async () => {
  const restore = applyEnv({
    TEST_DATABASE_URL: withDatabaseName('rodando_reset_env_off_e2e'),
    E2E_ALLOW_RESET: '0',
    E2E_RESET_TOKEN: 'token-reset-ok',
  })

  try {
    const { app } = createTestContext(false)
    const response = await request(app).post('/api/test/reset-non-user').set('x-e2e-reset-token', 'token-reset-ok').send({})

    assert.equal(response.status, 403)
    assert.match(String(response.body?.error || ''), /desabilitado/i)
  } finally {
    restore()
  }
})

test('e2e reset endpoint: bloqueia quando banco nao eh *_e2e', async () => {
  const restore = applyEnv({
    TEST_DATABASE_URL: withDatabaseName('rodando_reset_guard'),
    E2E_ALLOW_RESET: '1',
    E2E_RESET_TOKEN: 'token-reset-ok',
  })

  try {
    const { app } = createTestContext(false)
    const response = await request(app).post('/api/test/reset-non-user').set('x-e2e-reset-token', 'token-reset-ok').send({})

    assert.equal(response.status, 403)
    assert.match(String(response.body?.error || ''), /_e2e/i)
  } finally {
    restore()
  }
})

test('e2e reset endpoint: executa reset e remove usuarios de teste em banco dedicado', async () => {
  const suffix = Date.now()
  const demoEmail = `auth_ui_${suffix}@rodando.local`
  const restore = applyEnv({
    TEST_DATABASE_URL: withDatabaseName('rodando_reset_success_e2e'),
    E2E_ALLOW_RESET: '1',
    E2E_RESET_TOKEN: 'token-reset-ok',
  })

  try {
    const { app } = createTestContext(false)
    const { queryOne } = require('../src/db')

    const owner = request.agent(app)
    const signin = await owner.post('/api/auth/owner/signin').send({
      email: process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local',
      password: process.env.OWNER_SEED_PASSWORD || '123456',
    })
    assert.equal(signin.status, 200)

    const createdProduct = await owner.post('/api/owner/products').send({
      name: `Produto reset ${suffix}`,
      sku: `RST-${suffix}`,
      manufacturer: 'QA Reset',
      category: 'Reset',
      bikeModel: 'CG 160',
      price: 79.9,
      cost: 39.5,
      stock: 11,
      minimumStock: 4,
      reorderPoint: 8,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Produto para validar endpoint de reset E2E.',
      isActive: true,
    })
    assert.equal(createdProduct.status, 201)

    const customer = request.agent(app)
    const signup = await customer.post('/api/auth/signup').send({
      name: 'Cliente Reset E2E',
      email: demoEmail,
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    })
    assert.equal(signup.status, 201)

    const response = await request(app).post('/api/test/reset-non-user').set('x-e2e-reset-token', 'token-reset-ok').send({})

    assert.equal(response.status, 200)
    assert.equal(response.body?.ok, true)
    assert.ok(Number(response.body?.removedDemoUsers || 0) >= 1)
    assert.ok(Number(response.body?.after?.products || 0) > 0)
    assert.equal(Number(response.body?.after?.offers || 0), 0)

    const demoUser = await queryOne('SELECT id FROM users WHERE lower(email) = lower($1)', [demoEmail])
    assert.equal(demoUser, null)
  } finally {
    restore()
  }
})
