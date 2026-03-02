const { initializeDatabase, purgeDemoUsers, closePool } = require('../../src/db')

async function run() {
  await initializeDatabase()
  const result = await purgeDemoUsers()
  console.log(`Usuarios demo/e2e removidos: ${Number(result?.removed || 0)}.`)
}

run()
  .catch((error) => {
    console.error('Falha ao remover usuarios demo/e2e:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
