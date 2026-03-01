const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function createTestContext(seedDemo = false) {
  fs.mkdtempSync(path.join(os.tmpdir(), 'rodando-domain-test-'))
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/rodando_test'
  process.env.DB_RESET = '1'
  process.env.SEED_DEMO_DATA = seedDemo ? '1' : '0'
  process.env.SEED_BASE_CATALOG = seedDemo ? '1' : '0'
  process.env.OWNER_SEED_EMAIL = process.env.OWNER_SEED_EMAIL || 'owner_test@rodando.local'
  process.env.OWNER_SEED_PASSWORD = process.env.OWNER_SEED_PASSWORD || '123456'
  process.env.OWNER_SEED_NAME = process.env.OWNER_SEED_NAME || 'Owner Test'

  const dbPath = require.resolve('../../src/db/index.js')
  const authPath = require.resolve('../../src/auth')
  const serverPath = require.resolve('../../src/server')

  delete require.cache[dbPath]
  delete require.cache[authPath]
  delete require.cache[serverPath]

  const { app } = require('../../src/server')
  return { app }
}

module.exports = { createTestContext }
