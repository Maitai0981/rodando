const { initializeDatabase, cleanRealData, queryOne, closePool } = require('../../src/db')

async function run() {
  await initializeDatabase()
  const beforeUsers = await queryOne('SELECT COUNT(*)::int AS total FROM users')
  const result = await cleanRealData()
  const afterUsers = await queryOne('SELECT COUNT(*)::int AS total FROM users')

  console.log(
    `Limpeza real concluida. Usuarios preservados: ${Number(beforeUsers?.total || 0)} -> ${Number(afterUsers?.total || 0)}. Demo removidos: ${Number(result?.removedDemoUsers || 0)}.`,
  )
  console.log(`Contagens operacionais: ${JSON.stringify(result?.counts || {}, null, 2)}`)
}

run()
  .catch((error) => {
    console.error('Falha na limpeza real de dados:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
