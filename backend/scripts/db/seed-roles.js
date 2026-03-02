const { initializeDatabase, closePool } = require('../../src/db')

async function run() {
  await initializeDatabase()
  console.log('Roles garantidos (customer/owner).')
}

run()
  .catch((error) => {
    console.error('Falha ao seed de roles:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
