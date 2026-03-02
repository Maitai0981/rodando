const { initializeDatabase, resetNonUserData, closePool, queryOne } = require('../../src/db')

async function run() {
  await initializeDatabase()
  const reseedBase = process.argv.includes('--reseed-base')

  const beforeUsers = await queryOne('SELECT COUNT(*)::int AS total FROM users')
  await resetNonUserData({ reseedBase })
  const afterUsers = await queryOne('SELECT COUNT(*)::int AS total FROM users')
  const products = await queryOne('SELECT COUNT(*)::int AS total FROM products')

  console.log(
    `Reset non-user concluido (reseedBase=${reseedBase ? '1' : '0'}). Usuarios preservados: ${Number(beforeUsers?.total || 0)} -> ${Number(afterUsers?.total || 0)}. Produtos atuais: ${Number(products?.total || 0)}.`,
  )
}

run()
  .catch((error) => {
    console.error('Falha ao resetar dados nao-usuario:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
