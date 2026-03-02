const { initializeDatabase, closePool } = require('../../src/db')

async function run() {
  await initializeDatabase()
  console.log('PostgreSQL schema aplicado com sucesso.')
}

run()
  .catch((error) => {
    console.error('Falha ao aplicar schema:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
