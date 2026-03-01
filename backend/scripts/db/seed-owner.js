const email = String(process.argv[2] || process.env.OWNER_SEED_EMAIL || '').trim().toLowerCase()
const password = String(process.argv[3] || process.env.OWNER_SEED_PASSWORD || '').trim()
const name = String(process.argv[4] || process.env.OWNER_SEED_NAME || 'Owner').trim()

if (!email || !password) {
  console.error('Uso: node scripts/db/seed-owner.js <email> <senha> [nome]')
  process.exit(1)
}

process.env.OWNER_SEED_EMAIL = email
process.env.OWNER_SEED_PASSWORD = password
process.env.OWNER_SEED_NAME = name

const { initializeDatabase, closePool } = require('../../src/db')

async function run() {
  await initializeDatabase()
  console.log(`Owner garantido: ${email}`)
}

run()
  .catch((error) => {
    console.error('Falha ao seed de owner:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
