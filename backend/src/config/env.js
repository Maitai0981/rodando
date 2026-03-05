const ALLOWED_APP_ENVS = new Set(['local', 'test', 'e2e', 'staging', 'production'])

function parseBooleanEnv(value, fallback = false) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

function resolveAppEnv() {
  const explicit = String(process.env.APP_ENV || '').trim().toLowerCase()
  if (explicit) {
    if (!ALLOWED_APP_ENVS.has(explicit)) {
      throw new Error(`APP_ENV invalido: "${explicit}". Use local|test|e2e|staging|production.`)
    }
    return explicit
  }

  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase()
  if (nodeEnv === 'production') return 'production'
  if (nodeEnv === 'test') return 'test'
  return 'local'
}

const APP_ENV = resolveAppEnv()
const isProductionLike = APP_ENV === 'production' || APP_ENV === 'staging'

function assertNodeVersion(minMajor = 20) {
  const major = Number(String(process.versions?.node || '').split('.')[0] || 0)
  if (!Number.isInteger(major) || major < minMajor) {
    throw new Error(`Node.js ${process.versions.node} nao suportado. Use Node >= ${minMajor}.`)
  }
}

function assertNoDestructiveFlagsInProduction() {
  if (!isProductionLike) return

  const destructiveFlags = [
    ['DB_RESET', parseBooleanEnv(process.env.DB_RESET, false)],
    ['SEED_BASE_CATALOG', parseBooleanEnv(process.env.SEED_BASE_CATALOG, false)],
    ['SEED_DEMO_DATA', parseBooleanEnv(process.env.SEED_DEMO_DATA, false)],
    ['E2E_ALLOW_RESET', parseBooleanEnv(process.env.E2E_ALLOW_RESET, false)],
  ]
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)

  if (destructiveFlags.length > 0) {
    throw new Error(
      `Flags destrutivas proibidas em ${APP_ENV}: ${destructiveFlags.join(', ')}. Desative-as para subir o backend.`,
    )
  }
}

function assertDestructiveAllowed(actionName = 'operacao destrutiva') {
  if (!isProductionLike) return
  const allowed = parseBooleanEnv(process.env.ALLOW_DESTRUCTIVE, false)
  if (!allowed) {
    throw new Error(
      `${actionName} bloqueada em ${APP_ENV}. Defina ALLOW_DESTRUCTIVE=1 apenas com janela operacional aprovada.`,
    )
  }
}

function getCookiePolicy() {
  const forceSecure = parseBooleanEnv(process.env.COOKIE_SECURE, isProductionLike)
  const sameSite = forceSecure ? 'none' : 'lax'
  return {
    secure: forceSecure,
    sameSite,
  }
}

function validateEnvironment() {
  const issues = []
  try {
    assertNodeVersion(20)
  } catch (error) {
    issues.push(String(error?.message || error))
  }
  try {
    assertNoDestructiveFlagsInProduction()
  } catch (error) {
    issues.push(String(error?.message || error))
  }
  if (isProductionLike && !String(process.env.DATABASE_URL || '').trim()) {
    issues.push(`DATABASE_URL obrigatorio em ${APP_ENV}.`)
  }

  return {
    appEnv: APP_ENV,
    isProductionLike,
    ok: issues.length === 0,
    issues,
  }
}

module.exports = {
  APP_ENV,
  isProductionLike,
  parseBooleanEnv,
  assertNodeVersion,
  assertNoDestructiveFlagsInProduction,
  assertDestructiveAllowed,
  getCookiePolicy,
  validateEnvironment,
}
