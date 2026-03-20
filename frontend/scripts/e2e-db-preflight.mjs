import process from 'node:process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

// Carrega .env.e2e automaticamente (se existir) sem sobrescrever variáveis já definidas no ambiente
const __dir = dirname(fileURLToPath(import.meta.url))
const envFile = resolve(__dir, '../.env.e2e')
try {
  const lines = readFileSync(envFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
} catch {
  // .env.e2e não existe — continua sem ele
}

const FALLBACK_E2E_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5432/rodando_e2e'

function resolveDatabaseUrl() {
  return (
    String(process.env.E2E_DATABASE_URL || '').trim() ||
    String(process.env.DATABASE_URL || '').trim() ||
    FALLBACK_E2E_DATABASE_URL
  )
}

function parseDatabaseTarget(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    return {
      ok: true,
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port || '5432',
      database: parsed.pathname.replace(/^\//, '') || '(default)',
      user: parsed.username || '(empty)',
      display: `${parsed.hostname || '127.0.0.1'}:${parsed.port || '5432'}/${parsed.pathname.replace(/^\//, '') || '(default)'} (user=${parsed.username || '(empty)'})`,
    }
  } catch {
    return {
      ok: false,
      host: 'n/a',
      port: 'n/a',
      database: 'n/a',
      user: 'n/a',
      display: 'invalid DATABASE_URL',
    }
  }
}

function printHeader(message) {
  console.error(`[e2e-db-preflight] ${message}`)
}

async function main() {
  const databaseUrl = resolveDatabaseUrl()
  const target = parseDatabaseTarget(databaseUrl)

  if (!target.ok) {
    printHeader('DATABASE_URL inválida. Verifique o formato da conexão.')
    printHeader(`Valor recebido: ${databaseUrl}`)
    process.exit(1)
  }

  if (!String(target.database || '').toLowerCase().includes('_e2e')) {
    printHeader('Banco de E2E invalido: DATABASE_URL precisa apontar para um banco com sufixo "_e2e".')
    printHeader(`Banco atual: ${target.database}`)
    printHeader('Exemplo esperado: rodando_e2e')
    process.exit(1)
  }

  printHeader(`Testando conexão em ${target.display}`)

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    printHeader('Conexão com PostgreSQL OK.')
  } catch (error) {
    const code = String(error?.code || '')
    printHeader(`Falha ao conectar no PostgreSQL (${code || 'sem-código'}).`)
    if (code === '28P01') {
      printHeader('Credencial inválida (usuário/senha).')
    } else if (code === 'ECONNREFUSED') {
      printHeader('PostgreSQL não está aceitando conexão em host/porta informados.')
    } else if (code === '3D000') {
      printHeader('Banco de dados não existe e/ou usuário não tem permissão para criar.')
    } else if (code === 'ENOTFOUND') {
      printHeader('Host do banco não encontrado.')
    } else if (String(error?.message || '').trim()) {
      printHeader(String(error.message))
    }

    printHeader('Defina a variável E2E_DATABASE_URL e tente novamente.')
    printHeader('Exemplo (PowerShell):')
    printHeader('$env:E2E_DATABASE_URL="postgres://postgres:SUA_SENHA@127.0.0.1:5432/rodando_e2e"')
    printHeader('npm --prefix frontend run test:e2e')
    process.exit(1)
  } finally {
    try {
      await client.end()
    } catch {
      // noop
    }
  }
}

await main()
