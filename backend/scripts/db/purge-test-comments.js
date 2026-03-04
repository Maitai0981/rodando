const { initializeDatabase, purgeTestComments, closePool } = require('../../src/db')

async function run() {
  await initializeDatabase()
  const result = await purgeTestComments()
  console.log(`Comentarios/reviews de teste removidos: ${Number(result?.removed || 0)}.`)
}

run()
  .catch((error) => {
    console.error('Falha ao remover comentarios/reviews de teste:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })

