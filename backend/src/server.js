
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const express = require('express')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const {
  collectOperationalCounts,
  connectionString,
  ensureSeedOwner,
  initializeDatabase,
  nowIso,
  pool,
  purgeDemoUsers,
  query,
  queryOne,
  resetNonUserData,
  withTransaction,
} = require('./db')
const {
  attachAuth,
  clearSessionCookie,
  createSession,
  createUser,
  deleteSessionByToken,
  getUserByEmail,
  requireAuth,
  requireOwner,
  setSessionCookie,
  verifyPassword,
} = require('./auth')
const logger = require('./perf/logger')
const { snapshot } = require('./perf/metrics')
const {
  attachRequestTelemetry,
  cacheKeyFromRequest,
  cacheJsonResponse,
  tryServeCachedJson,
  invalidatePublicCache,
  PUBLIC_CACHE_CONTROL,
} = require('./perf/http')
const {
  APP_ENV,
  validateEnvironment,
} = require('./config/env')

const PORT = Number(process.env.PORT || 4000)
const FREE_SHIPPING_TARGET = 199
const OWNER_DASHBOARD_DEFAULT_PAGE_SIZE = 20
const OWNER_DASHBOARD_MAX_PAGE_SIZE = 120
const ADDRESS_LIMIT_PER_USER = 10
const UX_ASSIST_SCOPE_VALUES = new Set(['public', 'owner'])
const UX_ASSIST_RATE_WINDOW_MS = 60 * 1000
const UX_ASSIST_RATE_LIMIT = 60
const uxAssistWriteWindows = new Map()
const STORE_DEFAULT_COORDS = { lat: -24.9555, lng: -53.4552 } // Cascavel-PR
const CASCAVEL_UF = 'PR'
const CASCAVEL_CITY = 'Cascavel'
const MP_ACCESS_TOKEN = String(process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim()
const MP_WEBHOOK_SECRET = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim()
const ALERT_EMAIL_WEBHOOK_URL = String(process.env.ALERT_EMAIL_WEBHOOK_URL || '').trim()
const ALERT_WHATSAPP_WEBHOOK_URL = String(process.env.ALERT_WHATSAPP_WEBHOOK_URL || '').trim()
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES || 6 * 1024 * 1024)
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const PUBLIC_CACHE_PREFIXES = ['products:', 'product-details:', 'offers:', 'comments:', 'catalog:']
const PRODUCT_MUTATION_CACHE_PREFIXES = ['products:', 'product-details:', 'offers:', 'catalog:']
const IDEMPOTENCY_ROUTE_CHECKOUT = '/api/orders/checkout'
const IDEMPOTENCY_TTL_HOURS = 24
const OUTBOX_MAX_ATTEMPTS = 5
const OUTBOX_RETRY_BASE_MS = 15_000
const OUTBOX_RETRY_MAX_MS = 15 * 60 * 1000
const OUTBOX_POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 5000)
const PUBLIC_COMMENT_AUTHOR_FILTER_SQL = `
  NOT (
    lower(u.email) = 'cliente_demo@rodando.local'
    OR lower(u.email) = 'owner_e2e@rodando.local'
    OR lower(u.email) LIKE 'auth_ui_%@rodando.local'
    OR lower(u.email) LIKE 'customer_e2e_%@rodando.local'
    OR lower(u.email) LIKE '%_e2e_%@rodando.local'
  )`

const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4175,http://127.0.0.1:4175')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

const app = express()
const dbReady = initializeDatabase()
const envValidation = validateEnvironment()
let outboxPoller = null
let outboxTickInFlight = null
const outboxRuntime = {
  enabled: true,
  running: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  processedJobs: 0,
  failedJobs: 0,
}
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

if (!envValidation.ok) {
  const message = `Falha de validacao de ambiente (${APP_ENV}): ${envValidation.issues.join(' | ')}`
  logger.error('env_validation_failed', { appEnv: APP_ENV, issues: envValidation.issues })
  throw new Error(message)
}

const ownerImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, UPLOADS_DIR)
    },
    filename: (_req, file, callback) => {
      const ext = resolveUploadExtension(file)
      callback(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: Number.isFinite(UPLOAD_MAX_BYTES) && UPLOAD_MAX_BYTES > 0 ? UPLOAD_MAX_BYTES : 6 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
      callback(new Error('Arquivo invalido. Envie JPG, PNG, WebP, GIF ou AVIF.'))
      return
    }
    callback(null, true)
  },
})

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(compression({ threshold: 1024 }))
app.use(attachRequestTelemetry)
app.use('/uploads', express.static(UPLOADS_DIR, { etag: true, maxAge: '7d', index: false }))
app.use(async (_req, _res, next) => {
  try {
    await dbReady
    next()
  } catch (error) {
    next(error)
  }
})
app.use(attachAuth)

app.use((req, res, next) => {
  const isPublicReadRequest = req.method === 'GET' && (
    req.path === '/api/health'
    || req.path === '/api/metrics'
    || req.path.startsWith('/api/products')
    || req.path.startsWith('/api/offers')
    || req.path.startsWith('/api/comments')
    || req.path.startsWith('/api/catalog/')
  )

  if (!isPublicReadRequest) {
    res.setHeader('Cache-Control', 'no-store')
  }
  next()
})

app.use((req, res, next) => {
  const origin = String(req.headers.origin || '')
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Vary', 'Origin')
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).send()
  }
  return next()
})

app.get('/api/health', async (_req, res) => {
  let database = { status: 'ok' }
  try {
    await queryOne('SELECT 1 AS ok')
  } catch {
    database = { status: 'degraded' }
  }

  res.setHeader('Cache-Control', 'no-store')
  res.json({
    status: database.status === 'ok' ? 'ok' : 'degraded',
    timestamp: nowIso(),
    database,
    pool: {
      total: Number(pool.totalCount || 0),
      idle: Number(pool.idleCount || 0),
      waiting: Number(pool.waitingCount || 0),
    },
  })
})

app.get('/api/ready', async (_req, res) => {
  const checks = {
    environment: {
      status: envValidation.ok ? 'ok' : 'error',
      appEnv: APP_ENV,
      issues: envValidation.issues,
    },
    database: { status: 'ok' },
    outbox: {
      status: outboxRuntime.lastError ? 'degraded' : 'ok',
      pollIntervalMs: OUTBOX_POLL_INTERVAL_MS,
      running: outboxRuntime.running,
      lastRunAt: outboxRuntime.lastRunAt,
      lastSuccessAt: outboxRuntime.lastSuccessAt,
      lastError: outboxRuntime.lastError,
    },
  }

  try {
    await queryOne('SELECT 1 AS ok')
  } catch (error) {
    checks.database = { status: 'error', reason: 'database_unavailable' }
  }

  try {
    const row = await queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('pending', 'error'))::int AS "pending",
        COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS "deadLetter"
       FROM outbox_jobs`,
    )
    checks.outbox.queue = {
      pending: Number(row?.pending || 0),
      deadLetter: Number(row?.deadLetter || 0),
    }
  } catch (_error) {
    checks.outbox = {
      ...checks.outbox,
      status: 'degraded',
      reason: 'outbox_unavailable',
    }
  }

  const hasHardFailure = checks.environment.status !== 'ok' || checks.database.status !== 'ok'
  res.setHeader('Cache-Control', 'no-store')
  res.status(hasHardFailure ? 503 : 200).json({
    status: hasHardFailure ? 'not_ready' : 'ready',
    timestamp: nowIso(),
    checks,
  })
})

app.get('/api/metrics', async (_req, res) => {
  let outbox = {
    enabled: outboxRuntime.enabled,
    running: outboxRuntime.running,
    pollIntervalMs: OUTBOX_POLL_INTERVAL_MS,
    processedJobs: outboxRuntime.processedJobs,
    failedJobs: outboxRuntime.failedJobs,
    lastRunAt: outboxRuntime.lastRunAt,
    lastSuccessAt: outboxRuntime.lastSuccessAt,
    lastError: outboxRuntime.lastError,
    queue: {
      pending: 0,
      processing: 0,
      deadLetter: 0,
    },
  }

  try {
    const row = await queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('pending', 'error'))::int AS "pending",
        COUNT(*) FILTER (WHERE status = 'processing')::int AS "processing",
        COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS "deadLetter"
       FROM outbox_jobs`,
    )
    outbox = {
      ...outbox,
      queue: {
        pending: Number(row?.pending || 0),
        processing: Number(row?.processing || 0),
        deadLetter: Number(row?.deadLetter || 0),
      },
    }
  } catch (_error) {
    outbox = {
      ...outbox,
      lastError: outbox.lastError || 'outbox_unavailable',
    }
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.json({
    status: 'ok',
    generatedAt: nowIso(),
    cachePolicyPublicRead: PUBLIC_CACHE_CONTROL,
    outbox,
    ...snapshot(),
  })
})

function invalidateStorefrontCache(prefixes = PUBLIC_CACHE_PREFIXES) {
  return invalidatePublicCache(prefixes)
}

app.post('/api/test/reset-non-user', async (req, res) => {
  const isResetEnabled = String(process.env.E2E_ALLOW_RESET || '0') === '1'
  if (!isResetEnabled) {
    return res.status(403).json({ error: 'Reset E2E desabilitado no ambiente atual.' })
  }

  const configuredToken = String(process.env.E2E_RESET_TOKEN || '').trim()
  const providedToken = String(req.headers['x-e2e-reset-token'] || '').trim()
  if (!configuredToken || providedToken !== configuredToken) {
    return res.status(401).json({ error: 'Token de reset E2E invalido.' })
  }

  if (!isE2EDatabase(connectionString)) {
    return res.status(403).json({ error: 'Reset permitido apenas em banco dedicado *_e2e.' })
  }

  try {
    const before = await collectOperationalCounts()
    await resetNonUserData({ reseedBase: true })
    const purged = await purgeDemoUsers()
    await ensureSeedOwner()
    const after = await collectOperationalCounts()
    return res.status(200).json({
      ok: true,
      removedDemoUsers: Number(purged?.removed || 0),
      before,
      after,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao executar reset E2E.' })
  }
})

app.get('/api/auth/me', (req, res) => {
  const authUser = req.auth?.user ?? null
  if (!authUser?.id) {
    return res.json({ user: null })
  }

  void (async () => {
    const row = await queryOne(
      `SELECT
        u.*,
        COALESCE(r.code, 'customer') AS role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1
      LIMIT 1`,
      [Number(authUser.id)],
    )
    if (!row) return res.json({ user: null })
    const addresses = await listUserAddresses(Number(authUser.id))
    const user = mapAuthUser(row)
    return res.json({
      user: {
        ...user,
        addresses,
        defaultAddressId: addresses.find((item) => Boolean(item.isDefault))?.id ?? null,
      },
    })
  })().catch(() => {
    res.status(500).json({ error: 'Falha ao carregar sessao.' })
  })
})

app.get('/api/ux/assist/state', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const scope = parseUxAssistScope(req.query.scope, { allowEmpty: true })
  if (scope === 'invalid') {
    return res.status(400).json({ error: 'Scope invalido. Use public ou owner.' })
  }

  try {
    const params = [userId]
    let whereSql = 'WHERE user_id = $1'
    if (scope) {
      params.push(scope)
      whereSql += ' AND scope = $2'
    }

    const rows = await query(
      `SELECT *
       FROM user_ux_assist_state
       ${whereSql}
       ORDER BY updated_at DESC, id DESC`,
      params,
    )
    const items = rows.rows.map(mapUxAssistStateRow)
    return res.json({ items })
  } catch {
    return res.status(500).json({ error: 'Falha ao carregar estado assistivo.' })
  }
})

app.put('/api/ux/assist/state', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  if (isUxAssistRateLimited(userId)) {
    return res.status(429).json({ error: 'Muitas atualizacoes de assistente. Tente novamente em instantes.' })
  }

  const scope = parseUxAssistScope(req.body?.scope)
  if (scope === 'invalid' || !scope) {
    return res.status(400).json({ error: 'Scope invalido. Use public ou owner.' })
  }

  const routeKey = String(req.body?.routeKey || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9-_/]{1,79}$/.test(routeKey)) {
    return res.status(400).json({ error: 'routeKey invalido.' })
  }

  const hasChecklistPatch = req.body?.checklistState !== undefined
  const hasDismissedPatch = req.body?.dismissedTips !== undefined
  const hasOverlayPatch = req.body?.overlaySeen !== undefined
  if (!hasChecklistPatch && !hasDismissedPatch && !hasOverlayPatch) {
    return res.status(400).json({ error: 'Nada para atualizar no estado assistivo.' })
  }

  let checklistPatch = {}
  if (hasChecklistPatch) {
    const parsedChecklist = sanitizeAssistChecklistState(req.body.checklistState)
    if (!parsedChecklist.ok) {
      return res.status(400).json({ error: parsedChecklist.error })
    }
    checklistPatch = parsedChecklist.value
  }

  let dismissedPatch = []
  if (hasDismissedPatch) {
    const parsedDismissed = sanitizeAssistDismissedTips(req.body.dismissedTips)
    if (!parsedDismissed.ok) {
      return res.status(400).json({ error: parsedDismissed.error })
    }
    dismissedPatch = parsedDismissed.value
  }

  if (hasOverlayPatch && typeof req.body.overlaySeen !== 'boolean') {
    return res.status(400).json({ error: 'overlaySeen deve ser booleano.' })
  }

  try {
    const item = await withTransaction(async (tx) => {
      const current = await tx.one(
        `SELECT *
         FROM user_ux_assist_state
         WHERE user_id = $1 AND scope = $2 AND route_key = $3
         LIMIT 1`,
        [userId, scope, routeKey],
      )

      const currentChecklist = sanitizeAssistChecklistState(current?.checklist_state).value || {}
      const mergedChecklist = hasChecklistPatch
        ? { ...currentChecklist, ...checklistPatch }
        : currentChecklist

      const currentDismissed = sanitizeAssistDismissedTips(current?.dismissed_tips).value || []
      const mergedDismissed = hasDismissedPatch
        ? Array.from(new Set([...currentDismissed, ...dismissedPatch]))
        : currentDismissed

      const nextOverlaySeen = hasOverlayPatch
        ? Boolean(req.body.overlaySeen)
        : Boolean(current?.overlay_seen)

      const upserted = await tx.one(
        `INSERT INTO user_ux_assist_state (
          user_id, scope, route_key, checklist_state, dismissed_tips, overlay_seen, updated_at
        ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
        ON CONFLICT (user_id, scope, route_key)
        DO UPDATE SET
          checklist_state = EXCLUDED.checklist_state,
          dismissed_tips = EXCLUDED.dismissed_tips,
          overlay_seen = EXCLUDED.overlay_seen,
          updated_at = NOW()
        RETURNING *`,
        [
          userId,
          scope,
          routeKey,
          JSON.stringify(mergedChecklist),
          JSON.stringify(mergedDismissed),
          nextOverlaySeen,
        ],
      )
      return mapUxAssistStateRow(upserted)
    })

    return res.status(200).json({ item })
  } catch {
    return res.status(500).json({ error: 'Falha ao atualizar estado assistivo.' })
  }
})

app.post('/api/ux/assist/reset', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const scope = parseUxAssistScope(req.query.scope, { allowEmpty: true })
  if (scope === 'invalid') {
    return res.status(400).json({ error: 'Scope invalido. Use public ou owner.' })
  }

  try {
    if (scope) {
      await query('DELETE FROM user_ux_assist_state WHERE user_id = $1 AND scope = $2', [userId, scope])
    } else {
      await query('DELETE FROM user_ux_assist_state WHERE user_id = $1', [userId])
    }
    return res.status(200).json({ ok: true, scope: scope || null })
  } catch {
    return res.status(500).json({ error: 'Falha ao resetar estado assistivo.' })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, cep, addressStreet, addressCity, addressState } = req.body || {}
    const safeName = String(name || '').trim()
    const safeEmail = String(email || '').trim().toLowerCase()
    const safePassword = String(password || '')
    const normalizedCep = normalizeCep(cep)
    const fallbackAddress = {
      street: String(addressStreet || '').trim(),
      city: String(addressCity || '').trim(),
      state: String(addressState || '').trim().toUpperCase(),
    }

    if (safeName.length < 2) return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' })
    if (!safeEmail.includes('@') || safeEmail.length < 5) return res.status(400).json({ error: 'Email invalido.' })
    if (safePassword.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' })
    if (!isValidCep(normalizedCep)) return res.status(400).json({ error: 'CEP invalido. Informe 8 digitos.' })
    if (await getUserByEmail(safeEmail)) return res.status(409).json({ error: 'Email ja cadastrado.' })

    let resolvedAddress = null
    try {
      const lookup = await lookupCep(normalizedCep)
      if (lookup.status === 'not_found') {
        return res.status(400).json({ error: 'CEP nao encontrado.' })
      }
      resolvedAddress = lookup.address
    } catch {
      if (isValidAddressFallback(fallbackAddress)) {
        resolvedAddress = fallbackAddress
      } else {
        return res.status(503).json({ error: 'Servico de CEP indisponivel. Informe logradouro, cidade e UF para continuar.' })
      }
    }

    const userRow = await createUser({
      name: safeName,
      email: safeEmail,
      password: safePassword,
      role: 'customer',
      cep: normalizedCep,
      addressStreet: resolvedAddress.street,
      addressCity: resolvedAddress.city,
      addressState: resolvedAddress.state,
    })
    await upsertUserAddress({
      userId: Number(userRow.id),
      id: null,
      label: 'Principal',
      cep: normalizedCep,
      street: resolvedAddress.street,
      number: '',
      complement: '',
      district: '',
      city: resolvedAddress.city,
      state: resolvedAddress.state,
      reference: '',
      isDefault: true,
    })
    await mergeGuestBagToUser(req.auth?.guestTokenHash, Number(userRow.id))
    const session = await createSession(userRow.id)
    setSessionCookie(res, session.token, session.expiresAt)
    const addresses = await listUserAddresses(Number(userRow.id))

    return res.status(201).json({
      message: 'Conta de cliente criada e autenticada.',
      user: {
        ...mapAuthUser(userRow),
        addresses,
        defaultAddressId: addresses.find((item) => Boolean(item.isDefault))?.id ?? null,
      },
    })
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('duplicate')) {
      return res.status(409).json({ error: 'Email ja cadastrado.' })
    }
    return res.status(500).json({ error: 'Falha ao criar conta.' })
  }
})

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body || {}
  const safeEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')
  if (!safeEmail || !safePassword) return res.status(400).json({ error: 'Informe email e senha.' })

  const userRow = await getUserByEmail(safeEmail)
  if (!userRow || !verifyPassword(safePassword, userRow.password_hash)) {
    return res.status(401).json({ error: 'Credenciais invalidas.' })
  }
  if (userRow.role === 'owner') {
    return res.status(403).json({ error: 'Conta owner deve usar /owner/login.' })
  }

  await mergeGuestBagToUser(req.auth?.guestTokenHash, Number(userRow.id))
  const session = await createSession(userRow.id)
  setSessionCookie(res, session.token, session.expiresAt)
  const addresses = await listUserAddresses(Number(userRow.id))

  return res.json({
    message: 'Login realizado com sucesso.',
    user: {
      ...mapAuthUser(userRow),
      addresses,
      defaultAddressId: addresses.find((item) => Boolean(item.isDefault))?.id ?? null,
    },
  })
})

app.post('/api/auth/owner/signin', async (req, res) => {
  const { email, password } = req.body || {}
  const safeEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')
  if (!safeEmail || !safePassword) return res.status(400).json({ error: 'Informe email e senha.' })

  const userRow = await getUserByEmail(safeEmail)
  if (!userRow || !verifyPassword(safePassword, userRow.password_hash)) {
    return res.status(401).json({ error: 'Credenciais invalidas.' })
  }
  if (userRow.role !== 'owner') {
    return res.status(403).json({ error: 'Acesso restrito ao owner.' })
  }

  await mergeGuestBagToUser(req.auth?.guestTokenHash, Number(userRow.id))
  const session = await createSession(userRow.id)
  setSessionCookie(res, session.token, session.expiresAt)
  const addresses = await listUserAddresses(Number(userRow.id))

  return res.json({
    message: 'Login owner realizado com sucesso.',
    user: {
      ...mapAuthUser(userRow),
      addresses,
      defaultAddressId: addresses.find((item) => Boolean(item.isDefault))?.id ?? null,
    },
  })
})

app.post('/api/auth/logout', async (req, res) => {
  await deleteSessionByToken(req.auth?.token)
  clearSessionCookie(res)
  res.json({ message: 'Logout realizado.' })
})

app.patch('/api/auth/profile', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const name = String(req.body?.name || '').trim()
  const phone = normalizePhone(req.body?.phone)
  const document = normalizeDocument(req.body?.document)

  if (name.length < 2) return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' })
  if (phone && phone.length < 10) return res.status(400).json({ error: 'Telefone invalido.' })
  if (document && !isValidDocument(document)) return res.status(400).json({ error: 'CPF/CNPJ invalido.' })

  const row = await queryOne(
    `UPDATE users
     SET name = $1, phone = $2, document = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [name, phone || null, document || null, userId],
  )
  if (!row) return res.status(404).json({ error: 'Usuario nao encontrado.' })

  const role = req.auth.user.role || 'customer'
  const addresses = await listUserAddresses(userId)
  return res.json({
    user: {
      ...mapAuthUser({ ...row, role }),
      addresses,
      defaultAddressId: addresses.find((item) => Boolean(item.isDefault))?.id ?? null,
    },
  })
})

app.get('/api/auth/addresses', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const items = await listUserAddresses(userId)
  return res.json({
    items,
    defaultAddressId: items.find((item) => Boolean(item.isDefault))?.id ?? null,
  })
})

app.post('/api/auth/addresses', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const payload = validateAddressPayload(req.body, { requireLabel: false })
  if (payload.error) return res.status(400).json({ error: payload.error })

  const count = await queryOne('SELECT COUNT(*)::int AS total FROM user_addresses WHERE user_id = $1', [userId])
  if (Number(count?.total || 0) >= ADDRESS_LIMIT_PER_USER) {
    return res.status(400).json({ error: `Limite de ${ADDRESS_LIMIT_PER_USER} enderecos por conta.` })
  }

  const item = await upsertUserAddress({
    userId,
    ...payload.value,
    id: null,
  })
  return res.status(201).json({ item })
})

app.put('/api/auth/addresses/:id', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Endereco invalido.' })

  const existing = await queryOne('SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [id, userId])
  if (!existing) return res.status(404).json({ error: 'Endereco nao encontrado.' })

  const payload = validateAddressPayload(req.body, { requireLabel: false })
  if (payload.error) return res.status(400).json({ error: payload.error })

  const item = await upsertUserAddress({
    userId,
    id,
    ...payload.value,
  })
  return res.json({ item })
})

app.patch('/api/auth/addresses/:id/default', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Endereco invalido.' })

  const existing = await queryOne('SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [id, userId])
  if (!existing) return res.status(404).json({ error: 'Endereco nao encontrado.' })

  await withTransaction(async (tx) => {
    await tx.query('UPDATE user_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1', [userId])
    await tx.query('UPDATE user_addresses SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userId])
  })

  const items = await listUserAddresses(userId)
  return res.json({
    items,
    defaultAddressId: id,
  })
})

app.delete('/api/auth/addresses/:id', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Endereco invalido.' })

  const existing = await queryOne('SELECT id, is_default AS "isDefault" FROM user_addresses WHERE id = $1 AND user_id = $2', [id, userId])
  if (!existing) return res.status(404).json({ error: 'Endereco nao encontrado.' })

  const openOrders = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM orders
     WHERE address_id = $1
       AND status IN ('created', 'paid', 'shipped')`,
    [id],
  )
  if (Number(openOrders?.total || 0) > 0) {
    return res.status(409).json({ error: 'Endereco vinculado a pedido em andamento.' })
  }

  await withTransaction(async (tx) => {
    await tx.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [id, userId])
    if (Boolean(existing.isDefault)) {
      await tx.query(
        `UPDATE user_addresses
         SET is_default = TRUE, updated_at = NOW()
         WHERE id = (
          SELECT ua.id
          FROM user_addresses ua
          WHERE ua.user_id = $1
          ORDER BY ua.created_at ASC
          LIMIT 1
         )`,
        [userId],
      )
    }
  })

  return res.status(204).send()
})
app.get('/api/bag', async (req, res) => {
  const actor = resolveBagActor(req)
  const items = await getBagItemsForActor(actor)
  const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  res.json({ items, total, freeShippingTarget: FREE_SHIPPING_TARGET })
})

app.post('/api/bag/items', async (req, res) => {
  const actor = resolveBagActor(req)
  const productId = Number(req.body?.productId)
  const requestedQty = Number(req.body?.quantity ?? 1)

  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'Produto invalido.' })
  if (!Number.isInteger(requestedQty) || requestedQty <= 0) return res.status(400).json({ error: 'Quantidade invalida.' })

  const product = await getProductById(productId)
  if (!product || !Boolean(product.isActive)) return res.status(404).json({ error: 'Produto nao encontrado.' })
  if (Number(product.stock) <= 0) return res.status(409).json({ error: 'Produto sem estoque.' })

  const current = await getBagItemQuantity(actor, productId)
  const nextQty = Math.min(Number(product.stock), Number(current?.quantity || 0) + requestedQty)
  if (nextQty <= 0) return res.status(409).json({ error: 'Quantidade indisponivel.' })

  await upsertBagItem(actor, productId, nextQty)
  await trackProductEvent(productId, 'add_to_cart', requestedQty)
  return res.status(201).json({ items: await getBagItemsForActor(actor) })
})

app.put('/api/bag/items/:productId', async (req, res) => {
  const actor = resolveBagActor(req)
  const productId = Number(req.params.productId)
  const quantity = Number(req.body?.quantity)

  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'Produto invalido.' })
  if (!Number.isInteger(quantity)) return res.status(400).json({ error: 'Quantidade invalida.' })

  if (quantity <= 0) {
    await deleteBagItem(actor, productId)
    return res.json({ items: await getBagItemsForActor(actor) })
  }

  const product = await getProductById(productId)
  if (!product || !Boolean(product.isActive)) return res.status(404).json({ error: 'Produto nao encontrado.' })
  const nextQty = Math.min(quantity, Number(product.stock))
  if (nextQty <= 0) return res.status(409).json({ error: 'Produto sem estoque.' })

  const existing = await getBagItemQuantity(actor, productId)
  if (!existing) return res.status(404).json({ error: 'Item nao encontrado na mochila.' })

  await upsertBagItem(actor, productId, nextQty)
  return res.json({ items: await getBagItemsForActor(actor) })
})

app.delete('/api/bag/items/:productId', async (req, res) => {
  const actor = resolveBagActor(req)
  const productId = Number(req.params.productId)
  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'Produto invalido.' })
  await deleteBagItem(actor, productId)
  return res.status(204).send()
})

app.delete('/api/bag', async (req, res) => {
  await clearBagForActor(resolveBagActor(req))
  return res.status(204).send()
})

app.post('/api/orders/quote', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const deliveryMethod = parseDeliveryMethod(req.body?.deliveryMethod)
  if (!deliveryMethod) return res.status(400).json({ error: 'Metodo de entrega invalido.' })

  const actor = { kind: 'user', userId }
  const items = await getBagItemsForActor(actor)
  if (items.length === 0) return res.status(400).json({ error: 'Mochila vazia.' })

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  const settings = await getEffectiveOwnerSettings()
  const address = deliveryMethod === 'delivery'
    ? await resolveCheckoutAddress(userId, req.body?.addressId)
    : null
  if (deliveryMethod === 'delivery' && !address) {
    return res.status(400).json({ error: 'Endereco de entrega nao encontrado.' })
  }

  const quote = await calculateShippingQuote({
    subtotal,
    deliveryMethod,
    address,
    items,
    settings,
  })

  return res.json({
    quote: {
      deliveryMethod,
      shippingCost: quote.shippingCost,
      distanceKm: quote.distanceKm,
      etaDays: quote.etaDays,
      ruleApplied: quote.ruleApplied,
      freeShippingApplied: quote.shippingCost <= 0,
    },
  })
})

function stableStringify(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function sanitizeIdempotencyKey(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  if (normalized.length < 8 || normalized.length > 160) return ''
  if (!/^[a-zA-Z0-9:_-]+$/.test(normalized)) return ''
  return normalized
}

function hashCheckoutPayload(body) {
  const normalized = {
    deliveryMethod: parseDeliveryMethod(body?.deliveryMethod) || 'pickup',
    recipientName: String(body?.recipientName || '').trim(),
    recipientDocument: normalizeDocument(body?.recipientDocument || ''),
    recipientPhone: normalizePhone(body?.recipientPhone || ''),
    addressId: parseOptionalPositiveInt(body?.addressId),
  }
  return crypto.createHash('sha256').update(stableStringify(normalized)).digest('hex')
}

async function resolveIdempotencyContext({ userId, route, idempotencyKey, requestHash }) {
  const key = sanitizeIdempotencyKey(idempotencyKey)
  if (!key) return { enabled: false }

  const existing = await queryOne(
    `SELECT id, request_hash AS "requestHash", response_status AS "responseStatus", response_body AS "responseBody", order_id AS "orderId"
     FROM idempotency_keys
     WHERE user_id = $1 AND route = $2 AND idempotency_key = $3 AND expires_at > NOW()
     LIMIT 1`,
    [Number(userId), route, key],
  )
  if (existing) {
    if (existing.requestHash !== requestHash) {
      return { enabled: true, key, conflict: true }
    }
    if (existing.responseStatus && existing.responseBody) {
      return {
        enabled: true,
        key,
        replay: true,
        responseStatus: Number(existing.responseStatus),
        responseBody: existing.responseBody,
      }
    }
    return { enabled: true, key, inProgress: true }
  }

  const inserted = await queryOne(
    `INSERT INTO idempotency_keys (user_id, route, idempotency_key, request_hash, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' hours')::interval, NOW(), NOW())
     ON CONFLICT (user_id, route, idempotency_key)
     DO NOTHING
     RETURNING id`,
    [Number(userId), route, key, requestHash, String(IDEMPOTENCY_TTL_HOURS)],
  )

  if (inserted?.id) {
    return { enabled: true, key, id: Number(inserted.id) }
  }

  const afterConflict = await queryOne(
    `SELECT request_hash AS "requestHash", response_status AS "responseStatus", response_body AS "responseBody"
     FROM idempotency_keys
     WHERE user_id = $1 AND route = $2 AND idempotency_key = $3 AND expires_at > NOW()
     LIMIT 1`,
    [Number(userId), route, key],
  )
  if (afterConflict?.requestHash && afterConflict.requestHash !== requestHash) {
    return { enabled: true, key, conflict: true }
  }
  if (afterConflict?.responseStatus && afterConflict?.responseBody) {
    return {
      enabled: true,
      key,
      replay: true,
      responseStatus: Number(afterConflict.responseStatus),
      responseBody: afterConflict.responseBody,
    }
  }

  return { enabled: true, key, inProgress: true }
}

async function saveIdempotencyResult(context, { responseStatus, responseBody, orderId = null }) {
  if (!context?.enabled || !context.key) return
  await query(
    `UPDATE idempotency_keys
     SET response_status = $4,
         response_body = $5::jsonb,
         order_id = $6,
         updated_at = NOW()
     WHERE user_id = $1 AND route = $2 AND idempotency_key = $3`,
    [
      Number(context.userId),
      String(context.route),
      String(context.key),
      Number(responseStatus),
      JSON.stringify(responseBody || {}),
      orderId ? Number(orderId) : null,
    ],
  )
}

function resolveWebhookEventId(data, paymentExternalId, status) {
  const explicit = String(
    data?.id
      || data?.eventId
      || data?.event_id
      || data?.resource
      || '',
  ).trim()
  if (explicit) return explicit
  const fallbackPayload = stableStringify(data || {})
  return `fallback:${paymentExternalId}:${status}:${crypto.createHash('sha256').update(fallbackPayload).digest('hex')}`
}

async function claimWebhookEvent({ eventId, paymentExternalId, status, payloadJson }) {
  return queryOne(
    `INSERT INTO payment_webhook_events (
       event_id, payment_external_id, normalized_status, payload_json, processing_status,
       process_attempts, last_seen_at, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, 'processing', 1, NOW(), NOW(), NOW())
     ON CONFLICT (event_id)
     DO UPDATE SET
       process_attempts = payment_webhook_events.process_attempts + 1,
       last_seen_at = NOW(),
       normalized_status = EXCLUDED.normalized_status,
       payload_json = EXCLUDED.payload_json,
       updated_at = NOW()
     RETURNING
       id,
       processing_status AS "processingStatus",
       processed_at AS "processedAt"`,
    [
      String(eventId),
      String(paymentExternalId),
      String(status),
      JSON.stringify(payloadJson || {}),
    ],
  )
}

async function markWebhookEventProcessed(eventId, orderId = null) {
  await query(
    `UPDATE payment_webhook_events
     SET processing_status = 'processed',
         processed_at = NOW(),
         order_id = COALESCE($2, order_id),
         last_error = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [Number(eventId), Number.isInteger(Number(orderId)) && Number(orderId) > 0 ? Number(orderId) : null],
  )
}

async function markWebhookEventErrored(eventId, reason) {
  await query(
    `UPDATE payment_webhook_events
     SET processing_status = 'error',
         last_error = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [Number(eventId), String(reason || 'Falha no processamento do webhook')],
  )
}

async function enqueueOutboxJob(jobType, payload, nextAttemptAt = null, tx = null) {
  const executor = tx || { one: queryOne }
  return executor.one(
    `INSERT INTO outbox_jobs (job_type, payload_json, status, attempts, next_attempt_at, created_at, updated_at)
     VALUES ($1, $2::jsonb, 'pending', 0, COALESCE($3::timestamptz, NOW()), NOW(), NOW())
     RETURNING id`,
    [String(jobType), JSON.stringify(payload || {}), nextAttemptAt],
  )
}

async function processOutboxJob(job) {
  const payload = job.payload_json || {}
  if (job.job_type === 'owner_sale_notification') {
    await processOwnerSaleNotifications(payload.order)
    return
  }
  throw new Error(`Job type nao suportado: ${job.job_type}`)
}

async function pollOutboxJobs(limit = 20) {
  const stats = { fetched: 0, processed: 0, failed: 0 }
  const dueJobs = await query(
    `SELECT *
     FROM outbox_jobs
     WHERE status IN ('pending', 'error')
       AND COALESCE(next_attempt_at, NOW()) <= NOW()
     ORDER BY created_at ASC
     LIMIT $1`,
    [Number(limit)],
  )
  stats.fetched = Number(dueJobs.rows.length || 0)

  for (const job of dueJobs.rows) {
    try {
      await query('UPDATE outbox_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['processing', Number(job.id)])
      await processOutboxJob(job)
      await query(
        `UPDATE outbox_jobs
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1`,
        [Number(job.id)],
      )
      stats.processed += 1
    } catch (error) {
      const attempts = Number(job.attempts || 0) + 1
      const maxedOut = attempts >= OUTBOX_MAX_ATTEMPTS
      const backoffMs = Math.min(OUTBOX_RETRY_MAX_MS, OUTBOX_RETRY_BASE_MS * (2 ** Math.max(0, attempts - 1)))
      await query(
        `UPDATE outbox_jobs
         SET status = $2,
             attempts = $3,
             last_error = $4,
             next_attempt_at = CASE WHEN $5 THEN NULL ELSE NOW() + ($6 || ' milliseconds')::interval END,
             updated_at = NOW()
         WHERE id = $1`,
        [
          Number(job.id),
          maxedOut ? 'dead_letter' : 'error',
          attempts,
          String(error?.message || error || 'Falha desconhecida'),
          maxedOut,
          String(backoffMs),
        ],
      )
      stats.failed += 1
    }
  }

  return stats
}

async function runOutboxTick() {
  if (outboxTickInFlight) return outboxTickInFlight
  outboxRuntime.running = true
  outboxRuntime.lastRunAt = nowIso()

  outboxTickInFlight = (async () => {
    try {
      await dbReady
      const stats = await pollOutboxJobs(20)
      outboxRuntime.processedJobs += Number(stats.processed || 0)
      outboxRuntime.failedJobs += Number(stats.failed || 0)
      outboxRuntime.lastSuccessAt = nowIso()
      outboxRuntime.lastError = null
      return stats
    } catch (error) {
      outboxRuntime.lastError = String(error?.message || error || 'Falha no worker de outbox')
      logger.error('outbox_worker_error', { error })
      return { fetched: 0, processed: 0, failed: 1 }
    } finally {
      outboxRuntime.running = false
      outboxTickInFlight = null
    }
  })()

  return outboxTickInFlight
}

function startOutboxWorker() {
  if (outboxPoller) return
  outboxRuntime.enabled = true
  void runOutboxTick()
  outboxPoller = setInterval(() => {
    void runOutboxTick()
  }, OUTBOX_POLL_INTERVAL_MS)
  if (typeof outboxPoller.unref === 'function') {
    outboxPoller.unref()
  }
}

function stopOutboxWorker() {
  if (!outboxPoller) return
  clearInterval(outboxPoller)
  outboxPoller = null
  outboxRuntime.enabled = false
  outboxRuntime.running = false
}

app.post('/api/orders/checkout', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const rawIdempotencyKey = String(req.headers['idempotency-key'] || '').trim()
  if (rawIdempotencyKey && !sanitizeIdempotencyKey(rawIdempotencyKey)) {
    return res.status(400).json({ error: 'Header Idempotency-Key invalido.' })
  }
  const idempotencyContext = await resolveIdempotencyContext({
    userId,
    route: IDEMPOTENCY_ROUTE_CHECKOUT,
    idempotencyKey: rawIdempotencyKey,
    requestHash: hashCheckoutPayload(req.body || {}),
  })
  if (idempotencyContext.conflict) {
    return res.status(409).json({ error: 'Idempotency-Key reutilizada com payload diferente.' })
  }
  if (idempotencyContext.replay) {
    res.setHeader('Idempotent-Replay', 'true')
    return res.status(Number(idempotencyContext.responseStatus || 200)).json(idempotencyContext.responseBody || {})
  }
  if (idempotencyContext.inProgress) {
    return res.status(409).json({ error: 'Requisicao ja esta em processamento para esta Idempotency-Key.' })
  }
  idempotencyContext.userId = userId
  idempotencyContext.route = IDEMPOTENCY_ROUTE_CHECKOUT

  const deliveryMethod = parseDeliveryMethod(req.body?.deliveryMethod) || 'pickup'
  const recipientName = String(req.body?.recipientName || req.auth.user?.name || '').trim()
  const recipientDocument = normalizeDocument(req.body?.recipientDocument || req.auth.user?.document || '')
  const recipientPhone = normalizePhone(req.body?.recipientPhone || req.auth.user?.phone || '')

  if (recipientName.length < 2) return res.status(400).json({ error: 'Nome do destinatario invalido.' })
  if (recipientDocument && !isValidDocument(recipientDocument)) return res.status(400).json({ error: 'CPF/CNPJ invalido.' })
  if (recipientPhone && recipientPhone.length < 10) return res.status(400).json({ error: 'Telefone invalido.' })

  try {
    const orderPayload = await withTransaction(async (tx) => {
      const cart = await getOrCreateOpenCart({ kind: 'user', userId }, tx)
      const bagItems = await getCartItemsByCartId(Number(cart.id), tx)
      if (bagItems.length === 0) throw Object.assign(new Error('Mochila vazia.'), { statusCode: 400 })

      for (const item of bagItems) {
        await trackProductEvent(item.productId, 'checkout_start', item.quantity, tx)
      }

      let subtotal = 0
      const productRows = []
      for (const item of bagItems) {
        const current = await getProductById(item.productId, tx)
        if (!current || !Boolean(current.isActive)) throw Object.assign(new Error(`Produto indisponivel: ${item.name}`), { statusCode: 409 })
        if (Number(current.stock) < Number(item.quantity)) throw Object.assign(new Error(`Estoque insuficiente para ${item.name}`), { statusCode: 409 })
        subtotal += Number(item.price) * Number(item.quantity)
        productRows.push(current)
      }

      const settings = await getEffectiveOwnerSettings(tx)
      const address = deliveryMethod === 'delivery'
        ? await resolveCheckoutAddress(userId, req.body?.addressId, tx)
        : null
      if (deliveryMethod === 'delivery' && !address) {
        throw Object.assign(new Error('Endereco de entrega nao encontrado.'), { statusCode: 400 })
      }
      const quote = await calculateShippingQuote({
        subtotal,
        deliveryMethod,
        address,
        items: bagItems,
        settings,
      })
      const addressSnapshot = address || buildPickupAddressSnapshot(settings)
      const total = Number((subtotal + quote.shippingCost).toFixed(2))
      const timestamp = nowIso()
      const minSnapshot = buildMinimumPriceSnapshot({
        items: bagItems,
        settings,
      })

      const orderRow = await tx.one(
        `INSERT INTO orders (
           user_id, status, subtotal, shipping, total, delivery_method, address_id,
           recipient_name, recipient_document, recipient_phone,
           delivery_street, delivery_number, delivery_complement, delivery_district, delivery_city, delivery_state, delivery_cep,
           distance_km, eta_days, payment_status, payment_provider, fiscal_status, minimum_profit_ok, minimum_price_snapshot_json,
           created_at, updated_at
         )
         VALUES (
           $1, 'created', $2, $3, $4, $5, $6,
           $7, $8, $9,
           $10, $11, $12, $13, $14, $15, $16,
           $17, $18, 'pending', 'mercado_pago', 'pending_data', $19, $20::jsonb,
           $21, $21
         )
         RETURNING id, status, total, created_at, updated_at`,
        [
          userId,
          subtotal,
          quote.shippingCost,
          total,
          deliveryMethod,
          addressSnapshot.id ? Number(addressSnapshot.id) : null,
          recipientName,
          recipientDocument || null,
          recipientPhone || null,
          addressSnapshot.street || null,
          addressSnapshot.number || null,
          addressSnapshot.complement || null,
          addressSnapshot.district || null,
          addressSnapshot.city || null,
          addressSnapshot.state || null,
          addressSnapshot.cep || null,
          quote.distanceKm,
          quote.etaDays,
          Boolean(minSnapshot.minimumProfitOk),
          JSON.stringify(minSnapshot),
          timestamp,
        ],
      )

      await tx.query(
        `INSERT INTO order_events (order_id, status, title, description, source, created_at)
         VALUES ($1, 'created', 'Pedido criado', 'Pedido recebido no sistema.', 'system', $2)`,
        [Number(orderRow.id), timestamp],
      )
      await tx.query(
        `INSERT INTO order_events (order_id, status, title, description, source, created_at)
         VALUES ($1, 'awaiting_payment', 'Aguardando pagamento', 'Pagamento iniciado no checkout.', 'system', $2)`,
        [Number(orderRow.id), timestamp],
      )
      await tx.query(
        `INSERT INTO shipping_quotes (order_id, method, distance_km, eta_days, shipping_cost, rule_applied, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [Number(orderRow.id), deliveryMethod, quote.distanceKm, quote.etaDays, quote.shippingCost, quote.ruleApplied, timestamp],
      )
      await tx.query(
        `INSERT INTO fiscal_documents (order_id, status, document_type, payload_json, created_at, updated_at)
         VALUES ($1, 'pending_data', 'NFe', $2::jsonb, $3, $3)`,
        [Number(orderRow.id), JSON.stringify({ recipientDocument, recipientName, address }), timestamp],
      )

      const location = await tx.one('SELECT id FROM stock_locations WHERE name = $1', ['Loja'])
      for (const item of bagItems) {
        const lineTotal = Number(item.price) * Number(item.quantity)
        await tx.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [Number(orderRow.id), item.productId, item.quantity, item.price, lineTotal, timestamp],
        )
        await tx.query('UPDATE product_stocks SET quantity = GREATEST(quantity - $1, 0) WHERE product_id = $2', [item.quantity, item.productId])
        await tx.query(
          'INSERT INTO inventory_movements (product_id, location_id, delta, reason, created_at) VALUES ($1, $2, $3, $4, $5)',
          [item.productId, Number(location?.id || 1), -Number(item.quantity), 'sale', timestamp],
        )
      }

      await tx.query('DELETE FROM cart_items WHERE cart_id = $1', [Number(cart.id)])
      await tx.query('UPDATE carts SET status = $1, updated_at = $2 WHERE id = $3', ['converted', timestamp, Number(cart.id)])

      return {
        id: Number(orderRow.id),
        status: orderRow.status,
        total: Number(orderRow.total),
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
        shipping: Number(quote.shippingCost),
        etaDays: Number(quote.etaDays),
        distanceKm: quote.distanceKm,
        deliveryMethod,
        subtotal: Number(subtotal),
        items: bagItems,
        customer: {
          id: userId,
          name: recipientName,
          document: recipientDocument,
          phone: recipientPhone || null,
          email: req.auth.user.email,
        },
        address: addressSnapshot,
      }
    })

    const payment = await createMercadoPagoCheckout(orderPayload)
    await query(
      `UPDATE orders
       SET payment_external_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [String(payment.externalId || ''), Number(orderPayload.id)],
    )
    await query(
      `INSERT INTO payment_transactions (order_id, provider, external_id, status, amount, payload_json, created_at, updated_at)
       VALUES ($1, 'mercado_pago', $2, 'pending', $3, $4::jsonb, NOW(), NOW())`,
      [Number(orderPayload.id), String(payment.externalId || ''), Number(orderPayload.total), JSON.stringify(payment.raw || {})],
    )

    const responsePayload = {
      order: {
        id: orderPayload.id,
        status: orderPayload.status,
        total: orderPayload.total,
        shipping: orderPayload.shipping,
        subtotal: orderPayload.subtotal,
        etaDays: orderPayload.etaDays,
        distanceKm: orderPayload.distanceKm,
        deliveryMethod: orderPayload.deliveryMethod,
        createdAt: orderPayload.createdAt,
        updatedAt: orderPayload.updatedAt,
      },
      payment,
    }
    await saveIdempotencyResult(idempotencyContext, {
      responseStatus: 201,
      responseBody: responsePayload,
      orderId: Number(orderPayload.id),
    })
    return res.status(201).json(responsePayload)
  } catch (error) {
    const message = String(error?.message || 'Falha ao finalizar pedido.')
    const statusCode = Number(error?.statusCode || 500)
    const safeStatusCode = statusCode >= 400 && statusCode < 500 ? statusCode : 500
    const responseBody = statusCode >= 400 && statusCode < 500
      ? { error: message }
      : { error: 'Falha ao finalizar pedido.' }
    await saveIdempotencyResult(idempotencyContext, {
      responseStatus: safeStatusCode,
      responseBody,
      orderId: null,
    })
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json(responseBody)
    }
    return res.status(500).json(responseBody)
  }
})

app.get('/api/orders', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const rows = await query(
    `SELECT
      id,
      status,
      total,
      subtotal,
      shipping,
      payment_status AS "paymentStatus",
      delivery_method AS "deliveryMethod",
      eta_days AS "etaDays",
      distance_km AS "distanceKm",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId],
  )

  res.json({
    items: rows.rows.map((row) => ({
      id: Number(row.id),
      status: row.status,
      total: Number(row.total),
      subtotal: Number(row.subtotal || 0),
      shipping: Number(row.shipping || 0),
      paymentStatus: row.paymentStatus,
      deliveryMethod: row.deliveryMethod || 'pickup',
      etaDays: row.etaDays === null || row.etaDays === undefined ? null : Number(row.etaDays),
      distanceKm: row.distanceKm === null || row.distanceKm === undefined ? null : Number(row.distanceKm),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  })
})

app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Pedido invalido.' })

  const order = await queryOne(
    `SELECT
      o.*,
      u.name AS "customerName",
      u.email AS "customerEmail"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1 AND o.user_id = $2
     LIMIT 1`,
    [id, userId],
  )
  if (!order) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  const items = await query(
    `SELECT
      oi.order_id AS "orderId",
      oi.product_id AS "productId",
      oi.quantity,
      oi.unit_price AS "unitPrice",
      oi.line_total AS "lineTotal",
      p.name,
      p.sku,
      COALESCE(main_image.url, '') AS "imageUrl"
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
     ) main_image ON TRUE
     WHERE oi.order_id = $1
     ORDER BY oi.created_at ASC`,
    [id],
  )
  const events = await query(
    `SELECT id, status, title, description, source, created_at AS "createdAt"
     FROM order_events
     WHERE order_id = $1
     ORDER BY created_at ASC, id ASC`,
    [id],
  )
  const payment = await queryOne(
    `SELECT provider, external_id AS "externalId", status, amount, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM payment_transactions
     WHERE order_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [id],
  )
  const fiscal = await queryOne(
    `SELECT status, document_type AS "documentType", number, series, access_key AS "accessKey", xml_url AS "xmlUrl", pdf_url AS "pdfUrl", updated_at AS "updatedAt"
     FROM fiscal_documents
     WHERE order_id = $1
     LIMIT 1`,
    [id],
  )

  return res.json({
    item: {
      id: Number(order.id),
      status: order.status,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      paymentStatus: order.payment_status,
      deliveryMethod: order.delivery_method || 'pickup',
      etaDays: order.eta_days === null || order.eta_days === undefined ? null : Number(order.eta_days),
      distanceKm: order.distance_km === null || order.distance_km === undefined ? null : Number(order.distance_km),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      recipientName: order.recipient_name || order.customerName,
      recipientDocument: order.recipient_document || null,
      recipientPhone: order.recipient_phone || null,
      address: {
        cep: order.delivery_cep || null,
        street: order.delivery_street || null,
        number: order.delivery_number || null,
        complement: order.delivery_complement || null,
        district: order.delivery_district || null,
        city: order.delivery_city || null,
        state: order.delivery_state || null,
      },
      items: items.rows.map((row) => ({
        orderId: Number(row.orderId),
        productId: Number(row.productId),
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        lineTotal: Number(row.lineTotal),
        name: row.name,
        sku: row.sku,
        imageUrl: row.imageUrl || '',
      })),
      events: events.rows.map((row) => ({
        id: Number(row.id),
        status: row.status,
        title: row.title,
        description: row.description,
        source: row.source,
        createdAt: row.createdAt,
      })),
      payment: payment
        ? {
            provider: payment.provider,
            externalId: payment.externalId || null,
            status: payment.status,
            amount: Number(payment.amount),
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          }
        : null,
      fiscal: fiscal
        ? {
            status: fiscal.status,
            documentType: fiscal.documentType,
            number: fiscal.number || null,
            series: fiscal.series || null,
            accessKey: fiscal.accessKey || null,
            xmlUrl: fiscal.xmlUrl || null,
            pdfUrl: fiscal.pdfUrl || null,
            updatedAt: fiscal.updatedAt,
          }
        : null,
    },
  })
})

app.get('/api/orders/:id/events', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Pedido invalido.' })

  const owned = await queryOne('SELECT 1 FROM orders WHERE id = $1 AND user_id = $2', [id, userId])
  if (!owned) return res.status(404).json({ error: 'Pedido nao encontrado.' })
  const rows = await query(
    `SELECT id, status, title, description, source, created_at AS "createdAt"
     FROM order_events
     WHERE order_id = $1
     ORDER BY created_at ASC, id ASC`,
    [id],
  )
  return res.json({
    items: rows.rows.map((row) => ({
      id: Number(row.id),
      status: row.status,
      title: row.title,
      description: row.description,
      source: row.source,
      createdAt: row.createdAt,
    })),
  })
})

app.post('/api/payments/webhooks/mercadopago', async (req, res) => {
  const signature = String(req.headers['x-signature'] || '')
  if (MP_WEBHOOK_SECRET && signature !== MP_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Assinatura de webhook invalida.' })
  }

  const data = req.body || {}
  const paymentExternalId = String(data?.paymentExternalId || data?.data?.id || '').trim()
  const status = normalizePaymentStatus(String(data?.status || data?.action || '').trim())
  if (!paymentExternalId) return res.status(400).json({ error: 'Payload sem identificador de pagamento.' })
  const webhookEventId = resolveWebhookEventId(data, paymentExternalId, status)
  const webhookEvent = await claimWebhookEvent({
    eventId: webhookEventId,
    paymentExternalId,
    status,
    payloadJson: data,
  })
  if (!webhookEvent?.id) {
    return res.status(500).json({ error: 'Falha ao registrar evento de webhook.' })
  }
  if (webhookEvent.processingStatus === 'processed' && webhookEvent.processedAt) {
    return res.status(200).json({ ok: true, deduplicated: true })
  }

  const tx = await queryOne(
    `SELECT order_id AS "orderId"
     FROM payment_transactions
     WHERE external_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [paymentExternalId],
  )
  if (!tx?.orderId) {
    await markWebhookEventErrored(Number(webhookEvent.id), 'Pagamento nao encontrado.')
    return res.status(404).json({ error: 'Pagamento nao encontrado.' })
  }

  try {
    await withTransaction(async (trx) => {
      await trx.query(
        `UPDATE payment_transactions
         SET status = $1, payload_json = $2::jsonb, updated_at = NOW()
         WHERE external_id = $3`,
        [status, JSON.stringify(data), paymentExternalId],
      )
      await trx.query(
        `UPDATE orders
         SET payment_status = $1,
             status = CASE WHEN $1 = 'paid' THEN 'paid' WHEN $1 IN ('rejected', 'cancelled') THEN 'cancelled' ELSE status END,
             updated_at = NOW()
         WHERE id = $2`,
        [status, Number(tx.orderId)],
      )
      const title = status === 'paid' ? 'Pagamento aprovado' : status === 'cancelled' ? 'Pagamento cancelado' : 'Pagamento atualizado'
      await trx.query(
        `INSERT INTO order_events (order_id, status, title, description, source, created_at)
         VALUES ($1, $2, $3, $4, 'webhook', NOW())`,
        [Number(tx.orderId), status, title, `Status recebido do gateway: ${status}.`],
      )

      if (status === 'paid') {
        await trx.query(
          `UPDATE fiscal_documents
           SET status = 'ready', updated_at = NOW()
           WHERE order_id = $1`,
          [Number(tx.orderId)],
        )
        const order = await trx.one(
          `SELECT
            o.id,
            o.total,
            o.subtotal,
            o.shipping,
            o.eta_days AS "etaDays",
            o.distance_km AS "distanceKm",
            o.delivery_method AS "deliveryMethod",
            o.recipient_name AS "recipientName",
            o.recipient_document AS "recipientDocument",
            o.recipient_phone AS "recipientPhone",
            o.delivery_street AS "deliveryStreet",
            o.delivery_number AS "deliveryNumber",
            o.delivery_complement AS "deliveryComplement",
            o.delivery_district AS "deliveryDistrict",
            o.delivery_city AS "deliveryCity",
            o.delivery_state AS "deliveryState",
            o.delivery_cep AS "deliveryCep",
            u.id AS "customerId",
            u.email AS "customerEmail"
           FROM orders o
           JOIN users u ON u.id = o.user_id
           WHERE o.id = $1
           LIMIT 1`,
          [Number(tx.orderId)],
        )

        if (order) {
          const notificationPayload = {
            id: Number(order.id),
            total: Number(order.total || 0),
            subtotal: Number(order.subtotal || 0),
            shipping: Number(order.shipping || 0),
            etaDays: order.etaDays === null || order.etaDays === undefined ? null : Number(order.etaDays),
            distanceKm: order.distanceKm === null || order.distanceKm === undefined ? null : Number(order.distanceKm),
            deliveryMethod: order.deliveryMethod || 'pickup',
            customer: {
              id: Number(order.customerId),
              email: order.customerEmail || null,
              name: order.recipientName || 'Cliente',
              document: order.recipientDocument || null,
              phone: order.recipientPhone || null,
            },
            address: {
              street: order.deliveryStreet || null,
              number: order.deliveryNumber || null,
              complement: order.deliveryComplement || null,
              district: order.deliveryDistrict || null,
              city: order.deliveryCity || null,
              state: order.deliveryState || null,
              cep: order.deliveryCep || null,
            },
          }
          await enqueueOutboxJob(
            'owner_sale_notification',
            {
              order: notificationPayload,
              source: 'payment_webhook',
              paymentExternalId,
              eventId: webhookEventId,
            },
            null,
            trx,
          )
        }
      }
    })

    await markWebhookEventProcessed(Number(webhookEvent.id), Number(tx.orderId))
    return res.status(200).json({ ok: true })
  } catch (error) {
    await markWebhookEventErrored(Number(webhookEvent.id), error?.message || 'Falha ao processar webhook.')
    return res.status(500).json({ error: 'Falha ao processar webhook de pagamento.' })
  }
})

app.get('/api/offers', async (req, res) => {
  const cacheKey = cacheKeyFromRequest(req, 'offers')
  if (tryServeCachedJson(req, res, cacheKey)) return

  const now = nowIso()
  const rows = await query(
    `${productOfferSelectSql()}
     WHERE o.is_active = TRUE
       AND p.is_active = TRUE
       AND (o.starts_at IS NULL OR o.starts_at <= $1)
       AND (o.ends_at IS NULL OR o.ends_at >= $1)
     ORDER BY o.updated_at DESC, o.id DESC
     LIMIT 24`,
    [now],
  )
  const payload = { items: rows.rows.map(mapOfferRow) }
  cacheJsonResponse(res, cacheKey, payload)
  res.json(payload)
})

app.get('/api/owner/offers', requireOwner, async (_req, res) => {
  const rows = await query(`${ownerOfferSelectSql()} ORDER BY o.updated_at DESC, o.id DESC`)
  res.json({ items: rows.rows.map(mapOwnerOfferRow) })
})
app.post('/api/owner/offers', requireOwner, async (req, res) => {
  const parsed = validateOfferPayload(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  const product = await getProductById(parsed.value.productId)
  if (!product) return res.status(404).json({ error: 'Produto nao encontrado para oferta.' })
  if (parsed.value.compareAtPrice <= Number(product.price)) {
    return res.status(400).json({ error: 'Preco comparativo deve ser maior que o preco atual do produto.' })
  }

  try {
    const row = await queryOne(
      `INSERT INTO offers (product_id, badge, description, compare_at_price, is_active, starts_at, ends_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [
        parsed.value.productId,
        parsed.value.badge,
        parsed.value.description,
        parsed.value.compareAtPrice,
        parsed.value.isActive,
        parsed.value.startsAt,
        parsed.value.endsAt,
      ],
    )
    const item = await getOfferById(Number(row.id))
    await saveOwnerAuditLog(req.auth.user.id, {
      actionType: 'offer_create',
      entityType: 'offer',
      entityId: Number(row.id),
      before: {},
      after: {
        productId: parsed.value.productId,
        compareAtPrice: parsed.value.compareAtPrice,
        isActive: parsed.value.isActive,
        startsAt: parsed.value.startsAt,
        endsAt: parsed.value.endsAt,
      },
    })
    invalidateStorefrontCache(PUBLIC_CACHE_PREFIXES)
    return res.status(201).json({ item })
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('duplicate')) {
      return res.status(409).json({ error: 'Este produto ja possui uma oferta.' })
    }
    return res.status(500).json({ error: 'Falha ao criar oferta.' })
  }
})

app.put('/api/owner/offers/:id', requireOwner, async (req, res) => {
  const offerId = Number(req.params.id)
  if (!Number.isInteger(offerId) || offerId <= 0) return res.status(400).json({ error: 'ID de oferta invalido.' })
  const current = await getOfferById(offerId)
  if (!current) return res.status(404).json({ error: 'Oferta nao encontrada.' })

  const parsed = validateOfferPayload(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  const product = await getProductById(parsed.value.productId)
  if (!product) return res.status(404).json({ error: 'Produto nao encontrado para oferta.' })
  if (parsed.value.compareAtPrice <= Number(product.price)) {
    return res.status(400).json({ error: 'Preco comparativo deve ser maior que o preco atual do produto.' })
  }

  try {
    await query(
      `UPDATE offers
       SET product_id = $1, badge = $2, description = $3, compare_at_price = $4,
           is_active = $5, starts_at = $6, ends_at = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        parsed.value.productId,
        parsed.value.badge,
        parsed.value.description,
        parsed.value.compareAtPrice,
        parsed.value.isActive,
        parsed.value.startsAt,
        parsed.value.endsAt,
        offerId,
      ],
    )
    const item = await getOfferById(offerId)
    await saveOwnerAuditLog(req.auth.user.id, {
      actionType: 'offer_update',
      entityType: 'offer',
      entityId: offerId,
      before: current,
      after: item,
    })
    invalidateStorefrontCache(PUBLIC_CACHE_PREFIXES)
    return res.json({ item })
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('duplicate')) {
      return res.status(409).json({ error: 'Este produto ja possui uma oferta.' })
    }
    return res.status(500).json({ error: 'Falha ao atualizar oferta.' })
  }
})

app.delete('/api/owner/offers/:id', requireOwner, async (req, res) => {
  const offerId = Number(req.params.id)
  if (!Number.isInteger(offerId) || offerId <= 0) return res.status(400).json({ error: 'ID de oferta invalido.' })
  const current = await getOfferById(offerId)
  if (!current) return res.status(404).json({ error: 'Oferta nao encontrada.' })
  const deleted = await query('DELETE FROM offers WHERE id = $1', [offerId])
  if (Number(deleted.rowCount) === 0) return res.status(404).json({ error: 'Oferta nao encontrada.' })
  await saveOwnerAuditLog(req.auth.user.id, {
    actionType: 'offer_delete',
    entityType: 'offer',
    entityId: offerId,
    before: current,
    after: {},
  })
  invalidateStorefrontCache(PUBLIC_CACHE_PREFIXES)
  return res.status(204).send()
})

app.get('/api/owner/settings', requireOwner, async (req, res) => {
  const ownerUserId = Number(req.auth.user.id)
  const item = await getEffectiveOwnerSettings(null, ownerUserId)
  return res.json({ item })
})

app.put('/api/owner/settings', requireOwner, async (req, res) => {
  const ownerUserId = Number(req.auth.user.id)
  const parsed = validateOwnerSettingsPayload(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  const row = await queryOne(
    `INSERT INTO owner_settings (
      owner_user_id, sales_alert_email, sales_alert_whatsapp, store_name, store_cnpj, store_ie,
      store_address_street, store_address_number, store_address_complement, store_address_district,
      store_address_city, store_address_state, store_address_cep, store_lat, store_lng,
      free_shipping_global_min, tax_profile, tax_percent, gateway_fee_percent, gateway_fixed_fee,
      operational_percent, packaging_cost, block_below_minimum, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22, $23, NOW(), NOW()
    )
    ON CONFLICT (owner_user_id)
    DO UPDATE SET
      sales_alert_email = EXCLUDED.sales_alert_email,
      sales_alert_whatsapp = EXCLUDED.sales_alert_whatsapp,
      store_name = EXCLUDED.store_name,
      store_cnpj = EXCLUDED.store_cnpj,
      store_ie = EXCLUDED.store_ie,
      store_address_street = EXCLUDED.store_address_street,
      store_address_number = EXCLUDED.store_address_number,
      store_address_complement = EXCLUDED.store_address_complement,
      store_address_district = EXCLUDED.store_address_district,
      store_address_city = EXCLUDED.store_address_city,
      store_address_state = EXCLUDED.store_address_state,
      store_address_cep = EXCLUDED.store_address_cep,
      store_lat = EXCLUDED.store_lat,
      store_lng = EXCLUDED.store_lng,
      free_shipping_global_min = EXCLUDED.free_shipping_global_min,
      tax_profile = EXCLUDED.tax_profile,
      tax_percent = EXCLUDED.tax_percent,
      gateway_fee_percent = EXCLUDED.gateway_fee_percent,
      gateway_fixed_fee = EXCLUDED.gateway_fixed_fee,
      operational_percent = EXCLUDED.operational_percent,
      packaging_cost = EXCLUDED.packaging_cost,
      block_below_minimum = EXCLUDED.block_below_minimum,
      updated_at = NOW()
    RETURNING *`,
    [
      ownerUserId,
      parsed.value.salesAlertEmail,
      parsed.value.salesAlertWhatsapp,
      parsed.value.storeName,
      parsed.value.storeCnpj,
      parsed.value.storeIe,
      parsed.value.storeAddressStreet,
      parsed.value.storeAddressNumber,
      parsed.value.storeAddressComplement,
      parsed.value.storeAddressDistrict,
      parsed.value.storeAddressCity,
      parsed.value.storeAddressState,
      parsed.value.storeAddressCep,
      parsed.value.storeLat,
      parsed.value.storeLng,
      parsed.value.freeShippingGlobalMin,
      parsed.value.taxProfile,
      parsed.value.taxPercent,
      parsed.value.gatewayFeePercent,
      parsed.value.gatewayFixedFee,
      parsed.value.operationalPercent,
      parsed.value.packagingCost,
      parsed.value.blockBelowMinimum,
    ],
  )

  await saveOwnerAuditLog(ownerUserId, {
    actionType: 'owner_settings_update',
    entityType: 'owner_settings',
    entityId: ownerUserId,
    before: {},
    after: row,
  })

  return res.json({ item: mapOwnerSettingsRow(row) })
})

app.get('/api/owner/shipping-promotions', requireOwner, async (_req, res) => {
  const now = nowIso()
  const rows = await query(
    `SELECT
      sp.*,
      p.name AS "productName",
      c.name AS "categoryName"
     FROM shipping_promotions sp
     LEFT JOIN products p ON p.id = sp.product_id
     LEFT JOIN categories c ON c.id = sp.category_id
     ORDER BY sp.is_active DESC, COALESCE(sp.ends_at, NOW() + INTERVAL '100 years') ASC, sp.id DESC`,
  )
  return res.json({
    items: rows.rows.map((row) => mapShippingPromotionRow(row, now)),
  })
})

app.post('/api/owner/shipping-promotions', requireOwner, async (req, res) => {
  const parsed = validateShippingPromotionPayload(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  const row = await queryOne(
    `INSERT INTO shipping_promotions (
      name, scope, product_id, category_id, is_free_shipping, starts_at, ends_at, is_active, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *`,
    [
      parsed.value.name,
      parsed.value.scope,
      parsed.value.productId,
      parsed.value.categoryId,
      parsed.value.isFreeShipping,
      parsed.value.startsAt,
      parsed.value.endsAt,
      parsed.value.isActive,
    ],
  )
  return res.status(201).json({ item: mapShippingPromotionRow(row) })
})

app.put('/api/owner/shipping-promotions/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Promocao invalida.' })

  const parsed = validateShippingPromotionPayload(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const row = await queryOne(
    `UPDATE shipping_promotions
     SET name = $1, scope = $2, product_id = $3, category_id = $4, is_free_shipping = $5,
         starts_at = $6, ends_at = $7, is_active = $8, updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      parsed.value.name,
      parsed.value.scope,
      parsed.value.productId,
      parsed.value.categoryId,
      parsed.value.isFreeShipping,
      parsed.value.startsAt,
      parsed.value.endsAt,
      parsed.value.isActive,
      id,
    ],
  )
  if (!row) return res.status(404).json({ error: 'Promocao nao encontrada.' })
  return res.json({ item: mapShippingPromotionRow(row) })
})

app.delete('/api/owner/shipping-promotions/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Promocao invalida.' })
  await query('DELETE FROM shipping_promotions WHERE id = $1', [id])
  return res.status(204).send()
})

app.get('/api/owner/orders', requireOwner, async (req, res) => {
  const limit = parsePositiveInt(req.query.limit, 50, 1, 200)
  const where = []
  const params = []

  if (req.query.status) {
    params.push(String(req.query.status))
    where.push(`o.status = $${params.length}`)
  }
  if (req.query.paymentStatus) {
    params.push(String(req.query.paymentStatus))
    where.push(`o.payment_status = $${params.length}`)
  }
  if (req.query.deliveryMethod) {
    params.push(String(req.query.deliveryMethod))
    where.push(`o.delivery_method = $${params.length}`)
  }
  if (req.query.city) {
    params.push(`%${String(req.query.city).trim().toLowerCase()}%`)
    where.push(`LOWER(COALESCE(o.delivery_city, '')) LIKE $${params.length}`)
  }
  if (req.query.customer) {
    params.push(`%${String(req.query.customer).trim().toLowerCase()}%`)
    where.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`)
  }

  params.push(limit)
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const rows = await query(
    `SELECT
      o.id, o.status, o.payment_status AS "paymentStatus", o.delivery_method AS "deliveryMethod",
      o.subtotal, o.shipping, o.total, o.eta_days AS "etaDays", o.distance_km AS "distanceKm",
      o.delivery_city AS "deliveryCity", o.delivery_state AS "deliveryState", o.created_at AS "createdAt", o.updated_at AS "updatedAt",
      u.id AS "customerId", u.name AS "customerName", u.email AS "customerEmail"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${params.length}`,
    params,
  )

  return res.json({
    items: rows.rows.map((row) => ({
      id: Number(row.id),
      status: row.status,
      paymentStatus: row.paymentStatus,
      deliveryMethod: row.deliveryMethod || 'pickup',
      subtotal: Number(row.subtotal || 0),
      shipping: Number(row.shipping || 0),
      total: Number(row.total || 0),
      etaDays: row.etaDays === null || row.etaDays === undefined ? null : Number(row.etaDays),
      distanceKm: row.distanceKm === null || row.distanceKm === undefined ? null : Number(row.distanceKm),
      deliveryCity: row.deliveryCity || null,
      deliveryState: row.deliveryState || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: Number(row.customerId),
        name: row.customerName,
        email: row.customerEmail,
      },
    })),
  })
})

app.get('/api/owner/orders/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Pedido invalido.' })

  const row = await queryOne(
    `SELECT
      o.*,
      u.name AS "customerName",
      u.email AS "customerEmail",
      u.phone AS "customerPhone",
      u.document AS "customerDocument"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1
     LIMIT 1`,
    [id],
  )
  if (!row) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  const items = await query(
    `SELECT oi.product_id AS "productId", oi.quantity, oi.unit_price AS "unitPrice", oi.line_total AS "lineTotal", p.name, p.sku
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.created_at ASC`,
    [id],
  )
  const events = await query(
    `SELECT id, status, title, description, source, created_at AS "createdAt"
     FROM order_events
     WHERE order_id = $1
     ORDER BY created_at ASC, id ASC`,
    [id],
  )
  const fiscal = await queryOne(
    `SELECT status, document_type AS "documentType", number, series, access_key AS "accessKey", xml_url AS "xmlUrl", pdf_url AS "pdfUrl", payload_json AS "payloadJson", updated_at AS "updatedAt"
     FROM fiscal_documents
     WHERE order_id = $1
     LIMIT 1`,
    [id],
  )

  return res.json({
    item: {
      id: Number(row.id),
      status: row.status,
      paymentStatus: row.payment_status,
      deliveryMethod: row.delivery_method || 'pickup',
      subtotal: Number(row.subtotal || 0),
      shipping: Number(row.shipping || 0),
      total: Number(row.total || 0),
      etaDays: row.eta_days === null || row.eta_days === undefined ? null : Number(row.eta_days),
      distanceKm: row.distance_km === null || row.distance_km === undefined ? null : Number(row.distance_km),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: {
        id: Number(row.user_id),
        name: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone || null,
        document: row.customerDocument || null,
      },
      address: {
        cep: row.delivery_cep || null,
        street: row.delivery_street || null,
        number: row.delivery_number || null,
        complement: row.delivery_complement || null,
        district: row.delivery_district || null,
        city: row.delivery_city || null,
        state: row.delivery_state || null,
      },
      items: items.rows.map((item) => ({
        productId: Number(item.productId),
        name: item.name,
        sku: item.sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
      events: events.rows.map((event) => ({
        id: Number(event.id),
        status: event.status,
        title: event.title,
        description: event.description,
        source: event.source,
        createdAt: event.createdAt,
      })),
      fiscal: fiscal
        ? {
            status: fiscal.status,
            documentType: fiscal.documentType,
            number: fiscal.number || null,
            series: fiscal.series || null,
            accessKey: fiscal.accessKey || null,
            xmlUrl: fiscal.xmlUrl || null,
            pdfUrl: fiscal.pdfUrl || null,
            payloadJson: fiscal.payloadJson || {},
            updatedAt: fiscal.updatedAt,
          }
        : null,
    },
  })
})

app.patch('/api/owner/orders/:id/status', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  const status = normalizeOrderStatus(String(req.body?.status || ''))
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Pedido invalido.' })
  if (!status) return res.status(400).json({ error: 'Status invalido.' })

  const current = await queryOne('SELECT id, status FROM orders WHERE id = $1', [id])
  if (!current) return res.status(404).json({ error: 'Pedido nao encontrado.' })

  await withTransaction(async (tx) => {
    await tx.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id])
    await tx.query(
      `INSERT INTO order_events (order_id, status, title, description, source, created_at)
       VALUES ($1, $2, $3, $4, 'owner', NOW())`,
      [id, status, `Status atualizado para ${status}`, 'Alterado no painel owner.'],
    )
    await saveOwnerAuditLog(req.auth.user.id, {
      actionType: 'order_status_update',
      entityType: 'order',
      entityId: id,
      before: { status: current.status },
      after: { status },
    }, tx)
  })

  return res.json({ ok: true })
})

app.get('/api/owner/analytics/orders', requireOwner, async (req, res) => {
  const period = String(req.query.period || 'month').toLowerCase()
  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30
  const metrics = await queryOne(
    `SELECT
      COUNT(*)::int AS "ordersCount",
      COALESCE(SUM(total), 0)::numeric(12,2) AS "revenue",
      COALESCE(AVG(total), 0)::numeric(12,2) AS "ticketAverage",
      COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS "paidCount",
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS "cancelledCount"
     FROM orders
     WHERE created_at >= NOW() - ($1::text || ' days')::interval`,
    [String(days)],
  )
  const byCity = await query(
    `SELECT
      COALESCE(delivery_city, 'Nao informado') AS city,
      COUNT(*)::int AS total
     FROM orders
     WHERE created_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY 1
     ORDER BY total DESC
     LIMIT 8`,
    [String(days)],
  )
  const byMethod = await query(
    `SELECT
      COALESCE(delivery_method, 'pickup') AS method,
      COUNT(*)::int AS total
     FROM orders
     WHERE created_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY 1`,
    [String(days)],
  )
  return res.json({
    periodDays: days,
    metrics: {
      ordersCount: Number(metrics?.ordersCount || 0),
      revenue: Number(metrics?.revenue || 0),
      ticketAverage: Number(metrics?.ticketAverage || 0),
      paidCount: Number(metrics?.paidCount || 0),
      cancelledCount: Number(metrics?.cancelledCount || 0),
    },
    byCity: byCity.rows.map((row) => ({ city: row.city, total: Number(row.total || 0) })),
    byMethod: byMethod.rows.map((row) => ({ method: row.method, total: Number(row.total || 0) })),
  })
})

app.get('/api/comments', async (req, res) => {
  const cacheKey = cacheKeyFromRequest(req, 'comments')
  if (tryServeCachedJson(req, res, cacheKey)) return

  const limit = parsePositiveInt(req.query.limit, 12, 1, 50)
  const productId = parseOptionalPositiveInt(req.query.productId)
  const where = ['r.is_public = TRUE', PUBLIC_COMMENT_AUTHOR_FILTER_SQL]
  const params = []
  if (productId !== null) {
    params.push(productId)
    where.push(`r.product_id = $${params.length}`)
  }
  params.push(limit)
  const limitBind = `$${params.length}`

  const itemsSql = `
    SELECT
      r.id,
      r.user_id AS "userId",
      r.product_id AS "productId",
      u.name AS "authorName",
      r.rating,
      r.message,
      r.created_at AS "createdAt",
      r.updated_at AS "updatedAt",
      p.name AS "productName",
      COALESCE(main_image.url, '') AS "productImageUrl"
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN products p ON p.id = r.product_id
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    WHERE ${where.join(' AND ')}
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ${limitBind}`

  const [itemsResult, summary] = await Promise.all([
    query(itemsSql, params),
    queryOne(
      `SELECT COUNT(*)::int AS "totalReviews", COALESCE(AVG(rating), 0)::numeric(10,2) AS "averageRating"
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.is_public = TRUE
         AND ${PUBLIC_COMMENT_AUTHOR_FILTER_SQL}`,
    ),
  ])

  let summaryByProduct = null
  if (productId !== null) {
    const row = await queryOne(
      `SELECT COUNT(*)::int AS "totalReviews", COALESCE(AVG(rating), 0)::numeric(10,2) AS "averageRating"
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.is_public = TRUE
         AND r.product_id = $1
         AND ${PUBLIC_COMMENT_AUTHOR_FILTER_SQL}`,
      [productId],
    )
    summaryByProduct = {
      totalReviews: Number(row?.totalReviews || 0),
      averageRating: Number(Number(row?.averageRating || 0).toFixed(1)),
    }
  }

  const payload = {
    items: itemsResult.rows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      productId: Number(row.productId),
      authorName: row.authorName,
      rating: Number(row.rating),
      message: row.message,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      productName: row.productName,
      productImageUrl: row.productImageUrl,
    })),
    summary: {
      totalReviews: Number(summary?.totalReviews || 0),
      averageRating: Number(Number(summary?.averageRating || 0).toFixed(1)),
    },
    summaryByProduct,
  }
  cacheJsonResponse(res, cacheKey, payload)
  res.json(payload)
})

app.post('/api/comments', requireAuth, async (req, res) => {
  const userId = Number(req.auth.user.id)
  const productId = Number(req.body?.productId)
  const rating = Number(req.body?.rating)
  const message = String(req.body?.message || '').trim()

  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'Informe um produto valido para avaliar.' })
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Avaliacao deve ser um numero entre 1 e 5.' })
  if (message.length < 8 || message.length > 500) return res.status(400).json({ error: 'Comentario deve ter entre 8 e 500 caracteres.' })

  const product = await getProductById(productId)
  if (!product || !Boolean(product.isActive)) return res.status(404).json({ error: 'Produto nao encontrado para avaliacao.' })

  const purchased = await queryOne(
    `SELECT 1
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = $1
       AND oi.product_id = $2
       AND o.status IN ('created', 'paid', 'shipped', 'completed')
     LIMIT 1`,
    [userId, productId],
  )
  if (!purchased) return res.status(403).json({ error: 'Somente clientes que compraram este produto podem avaliar.' })

  const upserted = await queryOne(
    `INSERT INTO reviews (user_id, product_id, rating, message, is_public, created_at, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET rating = EXCLUDED.rating, message = EXCLUDED.message, updated_at = NOW()
     RETURNING id`,
    [userId, productId, rating, message],
  )

  const item = await queryOne(
    `SELECT
      r.id,
      r.user_id AS "userId",
      r.product_id AS "productId",
      u.name AS "authorName",
      r.rating,
      r.message,
      r.created_at AS "createdAt",
      r.updated_at AS "updatedAt",
      p.name AS "productName",
      COALESCE(main_image.url, '') AS "productImageUrl"
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN products p ON p.id = r.product_id
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    WHERE r.id = $1`,
    [Number(upserted.id)],
  )

  const payload = {
    item: {
      id: Number(item.id),
      userId: Number(item.userId),
      productId: Number(item.productId),
      authorName: item.authorName,
      rating: Number(item.rating),
      message: item.message,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
    },
  }
  invalidateStorefrontCache(['comments:', 'product-details:', 'products:', 'catalog:'])
  res.status(201).json(payload)
})

app.get('/api/products', async (req, res) => {
  const cacheKey = cacheKeyFromRequest(req, 'products')
  if (tryServeCachedJson(req, res, cacheKey)) return

  const result = await listProductsFromQuery(req.query)
  if (result.error) return res.status(400).json({ error: result.error })
  await trackProductEvents(
    result.payload.items.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0),
    'view',
  )
  cacheJsonResponse(res, cacheKey, result.payload)
  res.json(result.payload)
})

app.get('/api/products/:id', async (req, res) => {
  const cacheKey = cacheKeyFromRequest(req, 'product-details')
  if (tryServeCachedJson(req, res, cacheKey)) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalido.' })
  }

  const details = await getPublicProductDetails(id)
  if (!details) {
    return res.status(404).json({ error: 'Produto nao encontrado.' })
  }

  await trackProductEvents([id], 'view')
  cacheJsonResponse(res, cacheKey, details)
  return res.json(details)
})

app.get('/api/catalog/highlights', async (req, res) => {
  const cacheKey = cacheKeyFromRequest(req, 'catalog:highlights')
  if (tryServeCachedJson(req, res, cacheKey)) return

  const result = await listProductsFromQuery({ sort: 'discount-desc', page: 1, pageSize: 8, onlyWithImage: true })
  if (result.error) return res.status(400).json({ error: result.error })
  await trackProductEvents(
    result.payload.items.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0),
    'view',
  )
  const payload = { items: result.payload.items }
  cacheJsonResponse(res, cacheKey, payload)
  res.json(payload)
})
app.get('/api/catalog/recommendations', async (req, res) => {
  const cacheKey = cacheKeyFromRequest(req, 'catalog:recommendations')
  if (tryServeCachedJson(req, res, cacheKey)) return

  const limit = parsePositiveInt(req.query.limit, 4, 1, 24)
  const excludedIds = parseIdList(req.query.exclude)
  const params = [nowIso()]

  let sql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      c.id AS "categoryId",
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description,
      p.seo_slug AS "seoSlug",
      p.seo_meta_title AS "seoMetaTitle",
      p.seo_meta_description AS "seoMetaDescription",
      p.cost,
      p.minimum_stock AS "minimumStock",
      p.reorder_point AS "reorderPoint",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      COALESCE(sales.total_sold, 0) AS "totalSold",
      active_offer.compare_at_price AS "compareAtPrice",
      active_offer.badge AS "offerBadge",
      active_offer.ends_at AS "offerEndsAt",
      CASE
        WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
          THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100)
        ELSE 0
      END AS "discountPercent"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity)::int AS total_sold
      FROM order_items oi
      GROUP BY oi.product_id
    ) sales ON sales.product_id = p.id
    LEFT JOIN LATERAL (
      SELECT o.compare_at_price, o.badge, o.ends_at
      FROM offers o
      WHERE o.product_id = p.id
        AND o.is_active = TRUE
        AND (o.starts_at IS NULL OR o.starts_at <= $1)
        AND (o.ends_at IS NULL OR o.ends_at >= $1)
      LIMIT 1
    ) active_offer ON TRUE
    WHERE p.is_active = TRUE
      AND COALESCE(main_image.url, '') <> ''
      AND st.quantity > 0
  `

  if (excludedIds.length > 0) {
    params.push(excludedIds)
    sql += ` AND p.id <> ALL($${params.length})`
  }

  params.push(limit)
  sql += ` ORDER BY COALESCE(sales.total_sold, 0) DESC, p.updated_at DESC LIMIT $${params.length}`

  const rows = await query(sql, params)
  await trackProductEvents(rows.rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0), 'view')
  const payload = { items: rows.rows.map(mapProductRow) }
  cacheJsonResponse(res, cacheKey, payload)
  res.json(payload)
})

app.get('/api/owner/dashboard', requireOwner, async (req, res) => {
  const parsed = parseOwnerDashboardFilters(req.query)
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error })
  }

  const filters = parsed.value
  const analyticsRows = await queryOwnerDashboardProductAnalytics(filters)
  const sortedRows = sortOwnerDashboardProducts(analyticsRows, filters.sortBy, filters.direction)
  const total = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const safePage = Math.min(filters.page, totalPages)
  const pageStart = (safePage - 1) * filters.pageSize
  const pageEnd = pageStart + filters.pageSize
  const pagedRows = sortedRows.slice(pageStart, pageEnd)
  const productIds = sortedRows.map((row) => row.id)
  const previousRange = derivePreviousRange(filters.startAt, filters.endAt)
  const previousRows = await queryOwnerDashboardProductAnalytics({
    ...filters,
    period: 'custom',
    startAt: previousRange.startAt,
    endAt: previousRange.endAt,
    daysRange: previousRange.daysRange,
  })

  const [metrics, trend, quality] = await Promise.all([
    buildOwnerDashboardMetrics(sortedRows, previousRows),
    queryOwnerDashboardTrend(filters, productIds),
    queryOwnerDashboardQuality(filters, productIds),
  ])

  const rankings = buildOwnerDashboardRankings(sortedRows)
  const inventory = buildOwnerDashboardInventory(sortedRows, filters.daysRange)
  const funnel = buildOwnerDashboardFunnel(sortedRows)
  const facets = buildOwnerDashboardFacets(analyticsRows)

  return res.json({
    filters: {
      period: filters.period,
      startAt: filters.startAt,
      endAt: filters.endAt,
      category: filters.category || null,
      manufacturer: filters.manufacturer || null,
      status: filters.status,
      q: filters.q,
      sortBy: filters.sortBy,
      direction: filters.direction,
      page: safePage,
      pageSize: filters.pageSize,
    },
    metrics,
    rankings,
    inventory,
    funnel,
    quality,
    facets,
    trend,
    products: {
      items: pagedRows.map(mapOwnerDashboardProductRow),
      meta: {
        page: safePage,
        pageSize: filters.pageSize,
        total,
        totalPages,
      },
    },
  })
})

app.get('/api/owner/returns', requireOwner, async (req, res) => {
  const status = String(req.query.status || '').trim().toLowerCase()
  const productId = parseOptionalPositiveInt(req.query.productId)
  const limit = parsePositiveInt(req.query.limit, 40, 1, 200)
  const params = []
  const where = []
  if (status) {
    params.push(status)
    where.push(`pr.status = $${params.length}`)
  }
  if (productId !== null) {
    params.push(productId)
    where.push(`pr.product_id = $${params.length}`)
  }
  params.push(limit)
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const rows = await query(
    `SELECT
      pr.id,
      pr.product_id AS "productId",
      p.name AS "productName",
      p.sku AS "productSku",
      pr.order_id AS "orderId",
      pr.user_id AS "userId",
      pr.quantity,
      pr.reason_code AS "reasonCode",
      COALESCE(rrc.label, 'Sem motivo') AS "reasonLabel",
      pr.reason_detail AS "reasonDetail",
      pr.status,
      pr.owner_notes AS "ownerNotes",
      pr.created_at AS "createdAt",
      pr.updated_at AS "updatedAt",
      pr.resolved_at AS "resolvedAt"
     FROM product_returns pr
     JOIN products p ON p.id = pr.product_id
     LEFT JOIN return_reason_catalog rrc ON rrc.code = pr.reason_code
     ${whereSql}
     ORDER BY pr.created_at DESC, pr.id DESC
     LIMIT $${params.length}`,
    params,
  )
  res.json({ items: rows.rows })
})

app.post('/api/owner/returns', requireOwner, async (req, res) => {
  const productId = Number(req.body?.productId)
  const quantity = Number(req.body?.quantity ?? 1)
  const reasonCode = String(req.body?.reasonCode || 'other').trim()
  const reasonDetail = String(req.body?.reasonDetail || '').trim()
  const orderId = parseOptionalPositiveInt(req.body?.orderId)
  const userId = parseOptionalPositiveInt(req.body?.userId)
  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'Produto invalido para devolucao.' })
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'Quantidade invalida para devolucao.' })
  const reasonExists = await queryOne('SELECT code FROM return_reason_catalog WHERE code = $1', [reasonCode])
  if (!reasonExists) return res.status(400).json({ error: 'Motivo de devolucao invalido.' })

  const created = await queryOne(
    `INSERT INTO product_returns (
      order_id, product_id, user_id, quantity, reason_code, reason_detail, status, owner_notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'open', '', NOW(), NOW())
    RETURNING id`,
    [orderId, productId, userId, quantity, reasonCode, reasonDetail],
  )

  await saveOwnerAuditLog(req.auth.user.id, {
    actionType: 'return_create',
    entityType: 'product_return',
    entityId: Number(created.id),
    before: {},
    after: { productId, quantity, reasonCode, orderId, userId },
  })

  const item = await queryOne(
    `SELECT pr.id, pr.product_id AS "productId", p.name AS "productName", p.sku AS "productSku",
            pr.order_id AS "orderId", pr.user_id AS "userId", pr.quantity,
            pr.reason_code AS "reasonCode", COALESCE(rrc.label, 'Sem motivo') AS "reasonLabel",
            pr.reason_detail AS "reasonDetail", pr.status, pr.owner_notes AS "ownerNotes",
            pr.created_at AS "createdAt", pr.updated_at AS "updatedAt", pr.resolved_at AS "resolvedAt"
     FROM product_returns pr
     JOIN products p ON p.id = pr.product_id
     LEFT JOIN return_reason_catalog rrc ON rrc.code = pr.reason_code
     WHERE pr.id = $1`,
    [Number(created.id)],
  )
  res.status(201).json({ item })
})

app.patch('/api/owner/returns/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de devolucao invalido.' })
  const current = await queryOne('SELECT * FROM product_returns WHERE id = $1', [id])
  if (!current) return res.status(404).json({ error: 'Devolucao nao encontrada.' })

  const nextStatus = String(req.body?.status || current.status).trim().toLowerCase()
  const allowedStatus = new Set(['open', 'in_review', 'approved', 'rejected', 'resolved'])
  if (!allowedStatus.has(nextStatus)) return res.status(400).json({ error: 'Status de devolucao invalido.' })
  const ownerNotes = String(req.body?.ownerNotes ?? current.owner_notes ?? '').trim()
  const resolvedAt = nextStatus === 'resolved' ? nowIso() : null

  await query(
    `UPDATE product_returns
     SET status = $1, owner_notes = $2, updated_at = NOW(), resolved_at = $3
     WHERE id = $4`,
    [nextStatus, ownerNotes, resolvedAt, id],
  )

  await saveOwnerAuditLog(req.auth.user.id, {
    actionType: 'return_update',
    entityType: 'product_return',
    entityId: id,
    before: current,
    after: { status: nextStatus, ownerNotes, resolvedAt },
  })

  const item = await queryOne('SELECT * FROM product_returns WHERE id = $1', [id])
  res.json({ item })
})

app.get('/api/owner/complaints', requireOwner, async (req, res) => {
  const status = String(req.query.status || '').trim().toLowerCase()
  const productId = parseOptionalPositiveInt(req.query.productId)
  const limit = parsePositiveInt(req.query.limit, 40, 1, 200)
  const params = []
  const where = []
  if (status) {
    params.push(status)
    where.push(`cc.status = $${params.length}`)
  }
  if (productId !== null) {
    params.push(productId)
    where.push(`cc.product_id = $${params.length}`)
  }
  params.push(limit)
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const rows = await query(
    `SELECT
      cc.id,
      cc.user_id AS "userId",
      cc.product_id AS "productId",
      p.name AS "productName",
      p.sku AS "productSku",
      cc.order_id AS "orderId",
      cc.title,
      cc.message,
      cc.severity,
      cc.status,
      cc.owner_notes AS "ownerNotes",
      cc.created_at AS "createdAt",
      cc.updated_at AS "updatedAt",
      cc.resolved_at AS "resolvedAt"
     FROM customer_complaints cc
     LEFT JOIN products p ON p.id = cc.product_id
     ${whereSql}
     ORDER BY cc.created_at DESC, cc.id DESC
     LIMIT $${params.length}`,
    params,
  )
  res.json({ items: rows.rows })
})

app.post('/api/owner/complaints', requireOwner, async (req, res) => {
  const productId = parseOptionalPositiveInt(req.body?.productId)
  const userId = parseOptionalPositiveInt(req.body?.userId)
  const orderId = parseOptionalPositiveInt(req.body?.orderId)
  const title = String(req.body?.title || '').trim()
  const message = String(req.body?.message || '').trim()
  const severity = String(req.body?.severity || 'medium').trim().toLowerCase()
  const allowedSeverity = new Set(['low', 'medium', 'high'])

  if (title.length < 3) return res.status(400).json({ error: 'Titulo da reclamacao invalido.' })
  if (message.length < 6) return res.status(400).json({ error: 'Mensagem da reclamacao invalida.' })
  if (!allowedSeverity.has(severity)) return res.status(400).json({ error: 'Severidade invalida.' })

  const created = await queryOne(
    `INSERT INTO customer_complaints (
      user_id, product_id, order_id, title, message, severity, status, owner_notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'open', '', NOW(), NOW())
    RETURNING id`,
    [userId, productId, orderId, title, message, severity],
  )

  await saveOwnerAuditLog(req.auth.user.id, {
    actionType: 'complaint_create',
    entityType: 'customer_complaint',
    entityId: Number(created.id),
    before: {},
    after: { productId, userId, orderId, title, severity },
  })

  const item = await queryOne('SELECT * FROM customer_complaints WHERE id = $1', [Number(created.id)])
  res.status(201).json({ item })
})

app.patch('/api/owner/complaints/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de reclamacao invalido.' })
  const current = await queryOne('SELECT * FROM customer_complaints WHERE id = $1', [id])
  if (!current) return res.status(404).json({ error: 'Reclamacao nao encontrada.' })

  const status = String(req.body?.status || current.status).trim().toLowerCase()
  const allowedStatus = new Set(['open', 'in_progress', 'resolved', 'closed'])
  if (!allowedStatus.has(status)) return res.status(400).json({ error: 'Status de reclamacao invalido.' })
  const ownerNotes = String(req.body?.ownerNotes ?? current.owner_notes ?? '').trim()
  const resolvedAt = ['resolved', 'closed'].includes(status) ? nowIso() : null

  await query(
    `UPDATE customer_complaints
     SET status = $1, owner_notes = $2, updated_at = NOW(), resolved_at = $3
     WHERE id = $4`,
    [status, ownerNotes, resolvedAt, id],
  )

  await saveOwnerAuditLog(req.auth.user.id, {
    actionType: 'complaint_update',
    entityType: 'customer_complaint',
    entityId: id,
    before: current,
    after: { status, ownerNotes, resolvedAt },
  })

  const item = await queryOne('SELECT * FROM customer_complaints WHERE id = $1', [id])
  res.json({ item })
})

app.get('/api/owner/audit-logs', requireOwner, async (req, res) => {
  const limit = parsePositiveInt(req.query.limit, 50, 1, 300)
  const rows = await query(
    `SELECT
      l.id,
      l.owner_user_id AS "ownerUserId",
      u.name AS "ownerName",
      l.action_type AS "actionType",
      l.entity_type AS "entityType",
      l.entity_id AS "entityId",
      l.before_json AS "before",
      l.after_json AS "after",
      l.created_at AS "createdAt"
     FROM owner_audit_logs l
     JOIN users u ON u.id = l.owner_user_id
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $1`,
    [limit],
  )
  res.json({ items: rows.rows })
})

app.post('/api/owner/uploads', requireOwner, async (req, res) => {
  let uploadedFile = null

  try {
    await new Promise((resolve, reject) => {
      ownerImageUpload.single('image')(req, res, (error) => {
        if (error) reject(error)
        else resolve(null)
      })
    })

    uploadedFile = req.file
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' })
    }

    const storageKey = `/uploads/${uploadedFile.filename}`
    const publicUrl = buildPublicAssetUrl(req, storageKey)

    const item = await queryOne(
      `INSERT INTO media_assets (
        owner_user_id,
        storage_key,
        public_url,
        original_name,
        mime_type,
        size_bytes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING
        id,
        owner_user_id AS "ownerUserId",
        storage_key AS "storageKey",
        public_url AS "publicUrl",
        original_name AS "originalName",
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        created_at AS "createdAt"`,
      [
        Number(req.auth.user.id),
        storageKey,
        publicUrl,
        uploadedFile.originalname,
        uploadedFile.mimetype,
        Number(uploadedFile.size || 0),
      ],
    )

    return res.status(201).json({ item })
  } catch (error) {
    if (uploadedFile?.path) {
      fs.unlink(uploadedFile.path, () => {})
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Imagem excede o limite de tamanho permitido.' })
    }
    if (String(error?.message || '').trim()) {
      return res.status(400).json({ error: String(error.message) })
    }
    return res.status(500).json({ error: 'Falha ao enviar imagem.' })
  }
})

app.get('/api/owner/products', requireOwner, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const params = []
  let where = ''
  if (q) {
    params.push(`%${q}%`)
    where = `
      WHERE lower(p.name) LIKE $1
         OR lower(p.sku) LIKE $1
         OR lower(m.name) LIKE $1
         OR lower(c.name) LIKE $1
         OR lower(p.bike_model) LIKE $1
    `
  }

  const rows = await query(
    `SELECT
      p.id,
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description,
      p.seo_slug AS "seoSlug",
      p.seo_meta_title AS "seoMetaTitle",
      p.seo_meta_description AS "seoMetaDescription",
      p.cost,
      p.minimum_stock AS "minimumStock",
      p.reorder_point AS "reorderPoint",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      0::int AS "totalSold",
      NULL::numeric AS "compareAtPrice",
      NULL::text AS "offerBadge",
      NULL::timestamptz AS "offerEndsAt",
      0::int AS "discountPercent"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE
    ${where}
    ORDER BY p.updated_at DESC, p.id DESC`,
    params,
  )

  res.json({ items: rows.rows.map(mapProductRow) })
})

app.get('/api/owner/products/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalido.' })
  const item = await getProductById(id)
  if (!item) return res.status(404).json({ error: 'Produto nao encontrado.' })
  return res.json({ item })
})
app.post('/api/owner/products', requireOwner, async (req, res) => {
  const parsed = validateProduct(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  try {
    const item = await withTransaction(async (tx) => {
      const categoryId = await ensureCategoryId(parsed.value.category, tx)
      const manufacturerId = await ensureManufacturerId(parsed.value.manufacturer, tx)

      const created = await tx.one(
        `INSERT INTO products (sku, name, description, category_id, manufacturer_id, bike_model, cost, minimum_stock, reorder_point, seo_slug, seo_meta_title, seo_meta_description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''), $13, NOW(), NOW())
         RETURNING id`,
        [
          parsed.value.sku,
          parsed.value.name,
          parsed.value.description,
          categoryId,
          manufacturerId,
          parsed.value.bikeModel,
          parsed.value.cost,
          parsed.value.minimumStock,
          parsed.value.reorderPoint,
          parsed.value.seoSlug,
          parsed.value.seoMetaTitle,
          parsed.value.seoMetaDescription,
          parsed.value.isActive,
        ],
      )

      const productId = Number(created.id)
      await tx.query('INSERT INTO product_stocks (product_id, quantity) VALUES ($1, $2)', [productId, parsed.value.stock])
      await tx.query('INSERT INTO product_prices (product_id, price, valid_from) VALUES ($1, $2, NOW())', [productId, parsed.value.price])
      await upsertProductImage(productId, 'main', parsed.value.imageUrl, tx)
      await upsertProductImage(productId, 'hover', parsed.value.hoverImageUrl, tx)
      const createdItem = await getProductById(productId, tx)
      await saveOwnerAuditLog(req.auth.user.id, {
        actionType: 'product_create',
        entityType: 'product',
        entityId: productId,
        before: {},
        after: createdItem,
      }, tx)
      return createdItem
    })

    invalidateStorefrontCache(PRODUCT_MUTATION_CACHE_PREFIXES)
    return res.status(201).json({ item })
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('duplicate')) {
      return res.status(409).json({ error: 'SKU ja cadastrado.' })
    }
    return res.status(500).json({ error: 'Falha ao criar produto.' })
  }
})

app.put('/api/owner/products/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalido.' })
  const current = await getProductById(id)
  if (!current) return res.status(404).json({ error: 'Produto nao encontrado.' })

  const parsed = validateProduct(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  try {
    const item = await withTransaction(async (tx) => {
      const categoryId = await ensureCategoryId(parsed.value.category, tx)
      const manufacturerId = await ensureManufacturerId(parsed.value.manufacturer, tx)

      await tx.query(
        `UPDATE products
         SET sku = $1, name = $2, description = $3, category_id = $4, manufacturer_id = $5,
             bike_model = $6, cost = $7, minimum_stock = $8, reorder_point = $9,
             seo_slug = NULLIF($10, ''), seo_meta_title = NULLIF($11, ''), seo_meta_description = NULLIF($12, ''),
             is_active = $13, updated_at = NOW()
         WHERE id = $14`,
        [
          parsed.value.sku,
          parsed.value.name,
          parsed.value.description,
          categoryId,
          manufacturerId,
          parsed.value.bikeModel,
          parsed.value.cost,
          parsed.value.minimumStock,
          parsed.value.reorderPoint,
          parsed.value.seoSlug,
          parsed.value.seoMetaTitle,
          parsed.value.seoMetaDescription,
          parsed.value.isActive,
          id,
        ],
      )

      await tx.query('UPDATE product_stocks SET quantity = $1 WHERE product_id = $2', [parsed.value.stock, id])

      if (Number(parsed.value.price) !== Number(current.price)) {
        await tx.query('UPDATE product_prices SET valid_to = NOW() WHERE product_id = $1 AND valid_to IS NULL', [id])
        await tx.query('INSERT INTO product_prices (product_id, price, valid_from) VALUES ($1, $2, NOW())', [id, parsed.value.price])
      }

      await upsertProductImage(id, 'main', parsed.value.imageUrl, tx)
      await upsertProductImage(id, 'hover', parsed.value.hoverImageUrl, tx)
      const updatedItem = await getProductById(id, tx)
      await saveOwnerAuditLog(req.auth.user.id, {
        actionType: 'product_update',
        entityType: 'product',
        entityId: id,
        before: current,
        after: updatedItem,
      }, tx)
      return updatedItem
    })

    invalidateStorefrontCache(PRODUCT_MUTATION_CACHE_PREFIXES)
    return res.json({ item })
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('duplicate')) {
      return res.status(409).json({ error: 'SKU ja cadastrado.' })
    }
    return res.status(500).json({ error: 'Falha ao atualizar produto.' })
  }
})

app.delete('/api/owner/products/:id', requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  const mode = String(req.query.mode || 'hard').trim().toLowerCase()
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalido.' })
  if (!['hard', 'archive'].includes(mode)) {
    return res.status(400).json({ error: 'Modo de exclusao invalido. Use hard ou archive.' })
  }

  const current = await getProductById(id)
  if (!current) return res.status(404).json({ error: 'Produto nao encontrado.' })

  try {
    if (mode === 'archive') {
      const item = await withTransaction(async (tx) => {
        await tx.query('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id])
        await tx.query('UPDATE offers SET is_active = FALSE, updated_at = NOW() WHERE product_id = $1 AND is_active = TRUE', [id])

        const archived = await getProductById(id, tx)
        await saveOwnerAuditLog(req.auth.user.id, {
          actionType: 'product_archive',
          entityType: 'product',
          entityId: id,
          before: current,
          after: archived || {},
        }, tx)
        return archived
      })

      if (!item) return res.status(404).json({ error: 'Produto nao encontrado.' })
      invalidateStorefrontCache(PRODUCT_MUTATION_CACHE_PREFIXES)
      return res.status(200).json({ item, archived: true })
    }

    const ref = await queryOne('SELECT EXISTS (SELECT 1 FROM order_items WHERE product_id = $1) AS "hasOrders"', [id])
    if (Boolean(ref?.hasOrders)) {
      return res.status(409).json({
        code: 'PRODUCT_HAS_ORDERS',
        error: 'Produto ja possui pedidos e nao pode ser excluido definitivamente. Use arquivar.',
        canArchive: true,
      })
    }

    const deleted = await withTransaction(async (tx) => {
      const result = await tx.query('DELETE FROM products WHERE id = $1', [id])
      if (Number(result.rowCount) === 0) return false

      await saveOwnerAuditLog(req.auth.user.id, {
        actionType: 'product_delete',
        entityType: 'product',
        entityId: id,
        before: current,
        after: {},
      }, tx)
      return true
    })

    if (!deleted) return res.status(404).json({ error: 'Produto nao encontrado.' })
    invalidateStorefrontCache(PRODUCT_MUTATION_CACHE_PREFIXES)
    return res.status(204).send()
  } catch (error) {
    if (String(error?.code || '') === '23503') {
      return res.status(409).json({
        code: 'PRODUCT_HAS_ORDERS',
        error: 'Produto ja possui pedidos e nao pode ser excluido definitivamente. Use arquivar.',
        canArchive: true,
      })
    }
    return res.status(500).json({ error: 'Falha ao excluir produto.' })
  }
})

app.use((err, req, res, _next) => {
  logger.error('http_unhandled_error', {
    requestId: req?.requestId || null,
    method: req?.method || null,
    path: req?.originalUrl || req?.path || null,
    error: err,
  })
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

function startServer(port = PORT) {
  startOutboxWorker()
  const server = app.listen(port, () => {
    logger.info('server_started', {
      port,
      url: `http://localhost:${port}`,
    })
  })
  server.on('close', () => {
    stopOutboxWorker()
  })
  return server
}

function resolveBagActor(req) {
  if (req.auth?.user?.id) return { kind: 'user', userId: Number(req.auth.user.id) }
  return { kind: 'guest', guestTokenHash: String(req.auth?.guestTokenHash || '') }
}

function mapAuthUser(userRow) {
  return {
    id: Number(userRow.id),
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone || null,
    document: userRow.document || null,
    cep: userRow.cep || null,
    addressStreet: userRow.address_street || null,
    addressCity: userRow.address_city || null,
    addressState: userRow.address_state || null,
    createdAt: userRow.created_at,
  }
}

function mapUxAssistStateRow(row) {
  const checklistState = sanitizeAssistChecklistState(row?.checklist_state).value || {}
  const dismissedTips = sanitizeAssistDismissedTips(row?.dismissed_tips).value || []
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    scope: row.scope,
    routeKey: row.route_key,
    checklistState,
    dismissedTips,
    overlaySeen: Boolean(row.overlay_seen),
    updatedAt: row.updated_at,
  }
}

function parseUxAssistScope(value, options = {}) {
  const allowEmpty = Boolean(options.allowEmpty)
  if (value === undefined || value === null || String(value).trim() === '') {
    return allowEmpty ? null : 'invalid'
  }
  const normalized = String(value).trim().toLowerCase()
  if (!UX_ASSIST_SCOPE_VALUES.has(normalized)) return 'invalid'
  return normalized
}

function sanitizeAssistChecklistState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: true, value: {} }
  }

  const sanitized = {}
  const entries = Object.entries(value)
  if (entries.length > 80) {
    return { ok: false, error: 'Checklist excede limite de itens.' }
  }

  for (const [rawKey, rawValue] of entries) {
    const key = String(rawKey || '').trim()
    if (!/^[a-z0-9][a-z0-9-_/]{1,79}$/i.test(key)) {
      return { ok: false, error: 'checklistState contem chave invalida.' }
    }
    sanitized[key] = Boolean(rawValue)
  }

  return { ok: true, value: sanitized }
}

function sanitizeAssistDismissedTips(value) {
  if (!Array.isArray(value)) {
    return { ok: true, value: [] }
  }

  const normalized = []
  for (const rawItem of value) {
    const item = String(rawItem || '').trim()
    if (!item) continue
    if (!/^[a-z0-9][a-z0-9-_/]{1,79}$/i.test(item)) {
      return { ok: false, error: 'dismissedTips contem item invalido.' }
    }
    normalized.push(item)
  }

  if (normalized.length > 120) {
    return { ok: false, error: 'dismissedTips excede limite permitido.' }
  }

  return { ok: true, value: Array.from(new Set(normalized)) }
}

function isUxAssistRateLimited(userId) {
  const key = Number(userId)
  if (!Number.isInteger(key) || key <= 0) return true

  const now = Date.now()
  const current = uxAssistWriteWindows.get(key)
  if (!current || now - current.startedAt > UX_ASSIST_RATE_WINDOW_MS) {
    uxAssistWriteWindows.set(key, { startedAt: now, count: 1 })
    return false
  }

  current.count += 1
  uxAssistWriteWindows.set(key, current)
  return current.count > UX_ASSIST_RATE_LIMIT
}

function normalizeCep(value) {
  return String(value || '').replace(/\D/g, '')
}

function isE2EDatabase(databaseUrl) {
  try {
    const parsed = new URL(String(databaseUrl || ''))
    const dbName = String(parsed.pathname || '').replace(/^\//, '').toLowerCase()
    return dbName.includes('_e2e')
  } catch {
    return false
  }
}

function isValidCep(cep) {
  return /^\d{8}$/.test(String(cep || ''))
}

function isValidAddressFallback(address) {
  const street = String(address?.street || '').trim()
  const city = String(address?.city || '').trim()
  const state = String(address?.state || '').trim().toUpperCase()
  return street.length >= 3 && city.length >= 2 && /^[A-Z]{2}$/.test(state)
}

async function lookupCep(cep) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CEP lookup failed: ${response.status}`)
    }

    const payload = await response.json()
    if (payload?.erro) {
      return { status: 'not_found' }
    }

    const street = String(payload?.logradouro || '').trim()
    const city = String(payload?.localidade || '').trim()
    const state = String(payload?.uf || '').trim().toUpperCase()
    if (city.length < 2 || !/^[A-Z]{2}$/.test(state)) {
      throw new Error('CEP payload missing city/state')
    }

    return {
      status: 'ok',
      address: {
        street,
        city,
        state,
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length > 13) return digits.slice(0, 13)
  return digits
}

function normalizeDocument(value) {
  return String(value || '').replace(/\D/g, '')
}

function isValidDocument(value) {
  const digits = normalizeDocument(value)
  if (digits.length === 11) return isValidCpf(digits)
  if (digits.length === 14) return isValidCnpj(digits)
  return false
}

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1+$/.test(cpf)) return false
  const calc = (base, factor) => {
    let total = 0
    for (let i = 0; i < base.length; i += 1) total += Number(base[i]) * (factor - i)
    const mod = (total * 10) % 11
    return mod === 10 ? 0 : mod
  }
  const first = calc(cpf.slice(0, 9), 10)
  const second = calc(cpf.slice(0, 10), 11)
  return first === Number(cpf[9]) && second === Number(cpf[10])
}

function isValidCnpj(cnpj) {
  if (!/^\d{14}$/.test(cnpj)) return false
  if (/^(\d)\1+$/.test(cnpj)) return false
  const calc = (base, factors) => {
    let total = 0
    for (let i = 0; i < factors.length; i += 1) total += Number(base[i]) * factors[i]
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
  }
  const first = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === Number(cnpj[12]) && second === Number(cnpj[13])
}

function mapUserAddressRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    label: row.label,
    cep: row.cep,
    street: row.street,
    number: row.number || '',
    complement: row.complement || '',
    district: row.district || '',
    city: row.city,
    state: row.state,
    reference: row.reference || '',
    lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function listUserAddresses(userId, tx = null) {
  const executor = tx || { query }
  const rows = await executor.query(
    `SELECT *
     FROM user_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at ASC, id ASC`,
    [userId],
  )
  return rows.rows.map(mapUserAddressRow)
}

function validateAddressPayload(body, { requireLabel = true } = {}) {
  const labelRaw = String(body?.label || '').trim()
  const label = labelRaw || 'Endereco'
  const cep = normalizeCep(body?.cep)
  const street = String(body?.street || '').trim()
  const number = String(body?.number || '').trim()
  const complement = String(body?.complement || '').trim()
  const district = String(body?.district || '').trim()
  const city = String(body?.city || '').trim()
  const state = String(body?.state || '').trim().toUpperCase()
  const reference = String(body?.reference || '').trim()
  const isDefault = parseBooleanWithDefault(body?.isDefault, false)
  const lat = parseOptionalNumber(body?.lat)
  const lng = parseOptionalNumber(body?.lng)

  if (requireLabel && label.length < 2) return { error: 'Rotulo do endereco invalido.' }
  if (!isValidCep(cep)) return { error: 'CEP invalido. Informe 8 digitos.' }
  if (street.length < 3) return { error: 'Logradouro invalido.' }
  if (city.length < 2) return { error: 'Cidade invalida.' }
  if (!/^[A-Z]{2}$/.test(state)) return { error: 'UF invalida.' }

  return {
    value: {
      label: label.slice(0, 40),
      cep,
      street: street.slice(0, 160),
      number: number.slice(0, 30),
      complement: complement.slice(0, 80),
      district: district.slice(0, 80),
      city: city.slice(0, 80),
      state,
      reference: reference.slice(0, 120),
      isDefault,
      lat,
      lng,
    },
  }
}

async function syncLegacyUserAddressFromDefault(userId, tx = null) {
  const executor = tx || { query, one: queryOne }
  const row = await executor.one(
    `SELECT cep, street, city, state
     FROM user_addresses
     WHERE user_id = $1 AND is_default = TRUE
     LIMIT 1`,
    [userId],
  )
  await executor.query(
    `UPDATE users
     SET cep = $1, address_street = $2, address_city = $3, address_state = $4, updated_at = NOW()
     WHERE id = $5`,
    [row?.cep || null, row?.street || null, row?.city || null, row?.state || null, userId],
  )
}

async function upsertUserAddress({
  userId,
  id = null,
  label,
  cep,
  street,
  number = '',
  complement = '',
  district = '',
  city,
  state,
  reference = '',
  isDefault = false,
  lat = null,
  lng = null,
}, tx = null) {
  const handler = async (trx) => {
    const existingCount = await trx.one('SELECT COUNT(*)::int AS total FROM user_addresses WHERE user_id = $1', [userId])
    const shouldBeDefault = Boolean(isDefault) || Number(existingCount?.total || 0) === 0

    if (shouldBeDefault) {
      await trx.query('UPDATE user_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1', [userId])
    }

    let row = null
    if (id) {
      row = await trx.one(
        `UPDATE user_addresses
         SET label = $1, cep = $2, street = $3, number = $4, complement = $5, district = $6,
             city = $7, state = $8, reference = $9, lat = $10, lng = $11,
             is_default = $12, updated_at = NOW()
         WHERE id = $13 AND user_id = $14
         RETURNING *`,
        [label, cep, street, number || null, complement || null, district || null, city, state, reference || null, lat, lng, shouldBeDefault, id, userId],
      )
    } else {
      row = await trx.one(
        `INSERT INTO user_addresses (
          user_id, label, cep, street, number, complement, district, city, state, reference, lat, lng, is_default, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [userId, label, cep, street, number || null, complement || null, district || null, city, state, reference || null, lat, lng, shouldBeDefault],
      )
    }

    await syncLegacyUserAddressFromDefault(userId, trx)
    return mapUserAddressRow(row)
  }

  return tx ? handler(tx) : withTransaction(handler)
}

function parseDeliveryMethod(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'pickup' || normalized === 'delivery') return normalized
  return null
}

async function resolveCheckoutAddress(userId, addressId, tx = null) {
  const executor = tx || { one: queryOne }
  const parsedAddressId = parseOptionalPositiveInt(addressId)
  if (parsedAddressId) {
    const explicit = await executor.one(
      `SELECT *
       FROM user_addresses
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [parsedAddressId, userId],
    )
    if (explicit) return mapUserAddressRow(explicit)
  }

  const fallback = await executor.one(
    `SELECT *
     FROM user_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [userId],
  )
  return fallback ? mapUserAddressRow(fallback) : null
}

function buildPickupAddressSnapshot(settings) {
  return {
    id: null,
    label: 'Retirada na loja',
    cep: settings.storeAddressCep || null,
    street: settings.storeAddressStreet || null,
    number: settings.storeAddressNumber || null,
    complement: settings.storeAddressComplement || null,
    district: settings.storeAddressDistrict || null,
    city: settings.storeAddressCity || CASCAVEL_CITY,
    state: settings.storeAddressState || CASCAVEL_UF,
    lat: settings.storeLat,
    lng: settings.storeLng,
  }
}

function defaultOwnerSettings(ownerUserId = null) {
  return {
    ownerUserId,
    salesAlertEmail: '',
    salesAlertWhatsapp: '',
    storeName: 'Rodando Moto Center',
    storeCnpj: '',
    storeIe: '',
    storeAddressStreet: 'Av. Brasil, 8708',
    storeAddressNumber: '',
    storeAddressComplement: '',
    storeAddressDistrict: '',
    storeAddressCity: CASCAVEL_CITY,
    storeAddressState: CASCAVEL_UF,
    storeAddressCep: '85807080',
    storeLat: STORE_DEFAULT_COORDS.lat,
    storeLng: STORE_DEFAULT_COORDS.lng,
    freeShippingGlobalMin: FREE_SHIPPING_TARGET,
    taxProfile: 'simples_nacional',
    taxPercent: 0.06,
    gatewayFeePercent: 0.049,
    gatewayFixedFee: 0,
    operationalPercent: 0.03,
    packagingCost: 0,
    blockBelowMinimum: false,
    createdAt: null,
    updatedAt: null,
  }
}

function mapOwnerSettingsRow(row) {
  if (!row) return defaultOwnerSettings()
  return {
    ownerUserId: Number(row.owner_user_id),
    salesAlertEmail: row.sales_alert_email,
    salesAlertWhatsapp: row.sales_alert_whatsapp || '',
    storeName: row.store_name || 'Rodando Moto Center',
    storeCnpj: row.store_cnpj || '',
    storeIe: row.store_ie || '',
    storeAddressStreet: row.store_address_street || '',
    storeAddressNumber: row.store_address_number || '',
    storeAddressComplement: row.store_address_complement || '',
    storeAddressDistrict: row.store_address_district || '',
    storeAddressCity: row.store_address_city || CASCAVEL_CITY,
    storeAddressState: row.store_address_state || CASCAVEL_UF,
    storeAddressCep: normalizeCep(row.store_address_cep || ''),
    storeLat: row.store_lat === null || row.store_lat === undefined ? STORE_DEFAULT_COORDS.lat : Number(row.store_lat),
    storeLng: row.store_lng === null || row.store_lng === undefined ? STORE_DEFAULT_COORDS.lng : Number(row.store_lng),
    freeShippingGlobalMin: Number(row.free_shipping_global_min || FREE_SHIPPING_TARGET),
    taxProfile: row.tax_profile || 'simples_nacional',
    taxPercent: Number(row.tax_percent || 0),
    gatewayFeePercent: Number(row.gateway_fee_percent || 0),
    gatewayFixedFee: Number(row.gateway_fixed_fee || 0),
    operationalPercent: Number(row.operational_percent || 0),
    packagingCost: Number(row.packaging_cost || 0),
    blockBelowMinimum: Boolean(row.block_below_minimum),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

async function getEffectiveOwnerSettings(tx = null, ownerUserId = null) {
  const executor = tx || { one: queryOne }
  const bind = []
  let where = ''
  if (Number.isInteger(Number(ownerUserId)) && Number(ownerUserId) > 0) {
    bind.push(Number(ownerUserId))
    where = `WHERE os.owner_user_id = $${bind.length}`
  }

  const row = await executor.one(
    `SELECT
      os.*,
      u.email AS owner_email
     FROM owner_settings os
     JOIN users u ON u.id = os.owner_user_id
     ${where}
     ORDER BY os.updated_at DESC
     LIMIT 1`,
    bind,
  )
  if (row) return mapOwnerSettingsRow(row)

  const owner = await executor.one(
    `SELECT u.id, u.email
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.code = 'owner'
     ORDER BY u.id ASC
     LIMIT 1`,
  )
  const fallback = defaultOwnerSettings(owner ? Number(owner.id) : null)
  if (owner?.email) fallback.salesAlertEmail = String(owner.email).trim().toLowerCase()
  return fallback
}

function normalizeCity(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function toRad(value) {
  return (Number(value) * Math.PI) / 180
}

function haversineDistanceKm(a, b) {
  if (!a || !b) return null
  const lat1 = Number(a.lat)
  const lon1 = Number(a.lng)
  const lat2 = Number(b.lat)
  const lon2 = Number(b.lng)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return Number((6371 * c).toFixed(2))
}

function resolveFallbackDistanceKm(address, settings) {
  const sameCity = normalizeCity(address?.city) === normalizeCity(settings?.storeAddressCity || CASCAVEL_CITY)
  if (sameCity) return 12
  const sameState = String(address?.state || '').toUpperCase() === String(settings?.storeAddressState || CASCAVEL_UF).toUpperCase()
  return sameState ? 180 : 520
}

function hasFreeShippingPromotion(items, promotions) {
  if (!Array.isArray(promotions) || promotions.length === 0) return false
  for (const promotion of promotions) {
    if (!promotion.is_free_shipping) continue
    if (promotion.scope === 'global') return true
    if (promotion.scope === 'product') {
      if (items.some((item) => Number(item.productId) === Number(promotion.product_id))) return true
    }
    if (promotion.scope === 'category') {
      if (items.some((item) => Number(item.categoryId) === Number(promotion.category_id))) return true
    }
  }
  return false
}

async function calculateShippingQuote({ subtotal, deliveryMethod, address, items, settings }) {
  if (deliveryMethod === 'pickup') {
    return {
      shippingCost: 0,
      distanceKm: 0,
      etaDays: 1,
      ruleApplied: 'pickup',
    }
  }

  const cityNormalized = normalizeCity(address?.city)
  const isCascavel =
    String(address?.state || '').trim().toUpperCase() === CASCAVEL_UF &&
    cityNormalized === normalizeCity(CASCAVEL_CITY)

  const now = nowIso()
  const promoRows = await query(
    `SELECT *
     FROM shipping_promotions
     WHERE is_active = TRUE
       AND is_free_shipping = TRUE
       AND (starts_at IS NULL OR starts_at <= $1)
       AND (ends_at IS NULL OR ends_at >= $1)`,
    [now],
  )

  const storeCoords = {
    lat: settings.storeLat ?? STORE_DEFAULT_COORDS.lat,
    lng: settings.storeLng ?? STORE_DEFAULT_COORDS.lng,
  }
  const distanceKm = haversineDistanceKm({ lat: address?.lat, lng: address?.lng }, storeCoords) ?? resolveFallbackDistanceKm(address, settings)
  const etaDays = Math.max(1, 1 + Math.ceil(Number(distanceKm || 0) / 300))

  if (isCascavel) {
    return { shippingCost: 0, distanceKm, etaDays, ruleApplied: 'cascavel_free_shipping' }
  }
  if (hasFreeShippingPromotion(items, promoRows.rows)) {
    return { shippingCost: 0, distanceKm, etaDays, ruleApplied: 'promotion_free_shipping' }
  }
  if (Number(subtotal || 0) >= Number(settings.freeShippingGlobalMin || FREE_SHIPPING_TARGET)) {
    return { shippingCost: 0, distanceKm, etaDays, ruleApplied: 'global_min_free_shipping' }
  }

  const shippingCost = Number((12 + Number(distanceKm || 0) * 0.35).toFixed(2))
  return { shippingCost, distanceKm, etaDays, ruleApplied: 'distance_base' }
}

function buildMinimumPriceSnapshot({ items, settings }) {
  const taxPercent = Number(settings.taxPercent || 0)
  const gatewayFeePercent = Number(settings.gatewayFeePercent || 0)
  const gatewayFixedFee = Number(settings.gatewayFixedFee || 0)
  const operationalPercent = Number(settings.operationalPercent || 0)
  const packagingCost = Number(settings.packagingCost || 0)

  const rows = (items || []).map((item) => {
    const price = Number(item.price || 0)
    const quantity = Number(item.quantity || 0)
    const cost = Number(item.cost || 0)
    const percentual = price * (taxPercent + gatewayFeePercent + operationalPercent)
    const unitTotalCost = cost + packagingCost + percentual + gatewayFixedFee
    const unitMargin = price - unitTotalCost
    return {
      productId: Number(item.productId || 0),
      price,
      quantity,
      cost,
      unitTotalCost: Number(unitTotalCost.toFixed(4)),
      unitMargin: Number(unitMargin.toFixed(4)),
      minimumProfitOk: unitMargin >= 0,
    }
  })

  return {
    taxPercent,
    gatewayFeePercent,
    gatewayFixedFee,
    operationalPercent,
    packagingCost,
    minimumProfitOk: rows.every((row) => row.minimumProfitOk),
    items: rows,
  }
}

async function createMercadoPagoCheckout(orderPayload) {
  if (!MP_ACCESS_TOKEN) {
    return {
      provider: 'mercado_pago',
      status: 'pending',
      externalId: `mock-${orderPayload.id}-${Date.now()}`,
      checkoutUrl: null,
      qrCode: null,
      pix: null,
      raw: { mode: 'mock' },
    }
  }

  try {
    const body = {
      items: [
        {
          id: String(orderPayload.id),
          title: `Pedido #${orderPayload.id}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(orderPayload.total),
        },
      ],
      payer: {
        email: orderPayload.customer?.email || undefined,
        name: orderPayload.customer?.name || undefined,
      },
      external_reference: String(orderPayload.id),
      notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL || undefined,
      back_urls: {
        success: process.env.MERCADOPAGO_BACK_URL_SUCCESS || undefined,
        failure: process.env.MERCADOPAGO_BACK_URL_FAILURE || undefined,
        pending: process.env.MERCADOPAGO_BACK_URL_PENDING || undefined,
      },
      auto_return: 'approved',
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.message || `Mercado Pago preference error: ${response.status}`)
    }

    return {
      provider: 'mercado_pago',
      status: 'pending',
      externalId: String(payload.id || payload.collector_id || `mp-${orderPayload.id}-${Date.now()}`),
      checkoutUrl: payload.init_point || payload.sandbox_init_point || null,
      qrCode: payload.point_of_interaction?.transaction_data?.qr_code || null,
      pix: payload.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      raw: payload,
    }
  } catch (error) {
    return {
      provider: 'mercado_pago',
      status: 'pending',
      externalId: `fallback-${orderPayload.id}-${Date.now()}`,
      checkoutUrl: null,
      qrCode: null,
      pix: null,
      raw: { mode: 'fallback', error: String(error?.message || error) },
    }
  }
}

function buildOwnerNotificationMessage(orderPayload) {
  const methodLabel = orderPayload.deliveryMethod === 'pickup' ? 'Retirada na loja' : 'Entrega'
  return [
    `Pedido #${orderPayload.id}`,
    `Cliente: ${orderPayload.customer?.name || 'Cliente'}`,
    `Documento: ${orderPayload.customer?.document || 'nao informado'}`,
    `Telefone: ${orderPayload.customer?.phone || 'nao informado'}`,
    `Metodo: ${methodLabel}`,
    `Subtotal: R$ ${Number(orderPayload.subtotal || 0).toFixed(2)}`,
    `Frete: R$ ${Number(orderPayload.shipping || 0).toFixed(2)}`,
    `Total: R$ ${Number(orderPayload.total || 0).toFixed(2)}`,
    `ETA: ${orderPayload.etaDays || 1} dia(s)`,
    `Endereco: ${orderPayload.address?.street || '-'}, ${orderPayload.address?.number || '-'} - ${orderPayload.address?.city || '-'} / ${orderPayload.address?.state || '-'}`,
  ].join('\n')
}

async function dispatchNotification(channel, target, payload) {
  const webhook = channel === 'email' ? ALERT_EMAIL_WEBHOOK_URL : ALERT_WHATSAPP_WEBHOOK_URL
  if (!webhook) return { status: 'sent', simulated: true }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel,
      target,
      payload,
    }),
  })
  if (!response.ok) {
    throw new Error(`Webhook ${channel} falhou com status ${response.status}`)
  }
  return { status: 'sent', simulated: false }
}

async function processOwnerSaleNotifications(orderPayload) {
  const settings = await getEffectiveOwnerSettings()
  const message = buildOwnerNotificationMessage(orderPayload)
  const channels = []
  if (settings.salesAlertEmail) {
    channels.push({ channel: 'email', target: settings.salesAlertEmail })
  }
  if (settings.salesAlertWhatsapp) {
    channels.push({ channel: 'whatsapp', target: settings.salesAlertWhatsapp })
  }

  for (const item of channels) {
    let attempts = 0
    let sent = false
    let lastError = null

    while (attempts < 3 && !sent) {
      attempts += 1
      try {
        await dispatchNotification(item.channel, item.target, {
          orderId: orderPayload.id,
          message,
          order: orderPayload,
        })
        sent = true
      } catch (error) {
        lastError = String(error?.message || error)
      }
    }

    await query(
      `INSERT INTO owner_notifications (order_id, channel, target, status, attempts, last_error, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        Number(orderPayload.id),
        item.channel,
        item.target,
        sent ? 'sent' : 'error',
        attempts,
        sent ? null : lastError,
        sent ? nowIso() : null,
      ],
    )
  }
}

function normalizePaymentStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'pending'
  if (['approved', 'paid', 'payment.approved'].includes(normalized)) return 'paid'
  if (['pending', 'in_process', 'process', 'payment.pending'].includes(normalized)) return 'pending'
  if (['rejected', 'payment.rejected'].includes(normalized)) return 'rejected'
  if (['cancelled', 'canceled', 'payment.cancelled', 'payment.canceled'].includes(normalized)) return 'cancelled'
  return 'pending'
}

function validateOwnerSettingsPayload(body) {
  const salesAlertEmail = String(body?.salesAlertEmail || '').trim().toLowerCase()
  if (!salesAlertEmail || !salesAlertEmail.includes('@')) {
    return { error: 'Email de alerta de vendas invalido.' }
  }

  const parsedTaxProfile = String(body?.taxProfile || 'simples_nacional').trim().toLowerCase()
  const taxProfile = parsedTaxProfile || 'simples_nacional'
  const numeric = (value, fallback) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const state = String(body?.storeAddressState || CASCAVEL_UF).trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(state)) {
    return { error: 'UF da loja invalida.' }
  }

  return {
    value: {
      salesAlertEmail,
      salesAlertWhatsapp: normalizePhone(body?.salesAlertWhatsapp || ''),
      storeName: String(body?.storeName || 'Rodando Moto Center').trim(),
      storeCnpj: normalizeDocument(body?.storeCnpj || ''),
      storeIe: String(body?.storeIe || '').trim(),
      storeAddressStreet: String(body?.storeAddressStreet || '').trim(),
      storeAddressNumber: String(body?.storeAddressNumber || '').trim(),
      storeAddressComplement: String(body?.storeAddressComplement || '').trim(),
      storeAddressDistrict: String(body?.storeAddressDistrict || '').trim(),
      storeAddressCity: String(body?.storeAddressCity || CASCAVEL_CITY).trim(),
      storeAddressState: state,
      storeAddressCep: normalizeCep(body?.storeAddressCep || ''),
      storeLat: numeric(body?.storeLat, STORE_DEFAULT_COORDS.lat),
      storeLng: numeric(body?.storeLng, STORE_DEFAULT_COORDS.lng),
      freeShippingGlobalMin: Math.max(0, numeric(body?.freeShippingGlobalMin, FREE_SHIPPING_TARGET)),
      taxProfile,
      taxPercent: Math.max(0, numeric(body?.taxPercent, 0.06)),
      gatewayFeePercent: Math.max(0, numeric(body?.gatewayFeePercent, 0.049)),
      gatewayFixedFee: Math.max(0, numeric(body?.gatewayFixedFee, 0)),
      operationalPercent: Math.max(0, numeric(body?.operationalPercent, 0.03)),
      packagingCost: Math.max(0, numeric(body?.packagingCost, 0)),
      blockBelowMinimum: parseBooleanWithDefault(body?.blockBelowMinimum, false),
    },
  }
}

function validateShippingPromotionPayload(body) {
  const name = String(body?.name || '').trim()
  const scope = String(body?.scope || 'product').trim().toLowerCase()
  const productId = parseOptionalPositiveInt(body?.productId)
  const categoryId = parseOptionalPositiveInt(body?.categoryId)
  const startsAt = String(body?.startsAt || '').trim() || null
  const endsAt = String(body?.endsAt || '').trim() || null
  const isActive = parseBooleanWithDefault(body?.isActive, true)
  const isFreeShipping = parseBooleanWithDefault(body?.isFreeShipping, true)

  if (name.length < 3) return { error: 'Nome da promocao invalido.' }
  if (!['product', 'category', 'global'].includes(scope)) return { error: 'Escopo de promocao invalido.' }
  if (scope === 'product' && !productId) return { error: 'Promocao por produto exige productId.' }
  if (scope === 'category' && !categoryId) return { error: 'Promocao por categoria exige categoryId.' }
  if (startsAt && !parseIsoDate(startsAt)) return { error: 'startsAt invalido.' }
  if (endsAt && !parseIsoDate(endsAt)) return { error: 'endsAt invalido.' }
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    return { error: 'Periodo de promocao invalido.' }
  }

  return {
    value: {
      name: name.slice(0, 80),
      scope,
      productId: scope === 'product' ? productId : null,
      categoryId: scope === 'category' ? categoryId : null,
      isFreeShipping,
      startsAt,
      endsAt,
      isActive,
    },
  }
}

function mapShippingPromotionRow(row, now = nowIso()) {
  const nowDate = new Date(now).getTime()
  const startsAt = row.starts_at || null
  const endsAt = row.ends_at || null
  const startsAtTs = startsAt ? new Date(startsAt).getTime() : null
  const endsAtTs = endsAt ? new Date(endsAt).getTime() : null
  const isRunning = Boolean(row.is_active)
    && (startsAtTs === null || startsAtTs <= nowDate)
    && (endsAtTs === null || endsAtTs >= nowDate)

  return {
    id: Number(row.id),
    name: row.name,
    scope: row.scope,
    productId: row.product_id === null || row.product_id === undefined ? null : Number(row.product_id),
    productName: row.productName || null,
    categoryId: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id),
    categoryName: row.categoryName || null,
    isFreeShipping: Boolean(row.is_free_shipping),
    startsAt,
    endsAt,
    isActive: Boolean(row.is_active),
    isRunning,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

function normalizeOrderStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const allowed = new Set(['created', 'paid', 'cancelled', 'shipped', 'completed'])
  return allowed.has(normalized) ? normalized : ''
}

function parsePositiveInt(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function parseOptionalPositiveInt(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseBooleanWithDefault(value, fallback) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  return fallback
}

function parseOptionalBoolean(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  return null
}

function parseIdList(value) {
  if (value === null || value === undefined || String(value).trim() === '') return []
  return String(value)
    .split(',')
    .map((chunk) => Number(chunk.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function parseProductSort(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const allowed = new Set(['name-asc', 'name-desc', 'price-asc', 'price-desc', 'newest', 'best-sellers', 'discount-desc'])
  return allowed.has(normalized) ? normalized : 'name-asc'
}

function getProductsOrderBy(sort) {
  switch (sort) {
    case 'name-desc':
      return 'p.name DESC, p.id DESC'
    case 'price-asc':
      return 'pr.price ASC, p.name ASC'
    case 'price-desc':
      return 'pr.price DESC, p.name ASC'
    case 'newest':
      return 'p.created_at DESC, p.id DESC'
    case 'best-sellers':
      return 'COALESCE(sales.total_sold, 0) DESC, p.name ASC'
    case 'discount-desc':
      return `CASE WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price THEN ((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) ELSE 0 END DESC, pr.price ASC`
    case 'name-asc':
    default:
      return 'p.name ASC, p.id ASC'
  }
}

function parseOwnerDashboardFilters(rawQuery) {
  const now = new Date()
  const period = String(rawQuery.period || 'month').trim().toLowerCase()
  const q = String(rawQuery.q || '').trim().toLowerCase()
  const category = String(rawQuery.category || '').trim()
  const manufacturer = String(rawQuery.manufacturer || '').trim()
  const status = parseOwnerDashboardStatus(rawQuery.status)
  const sortBy = parseOwnerDashboardSort(rawQuery.sortBy)
  const direction = parseOwnerDashboardDirection(rawQuery.direction)
  const page = parsePositiveInt(rawQuery.page, 1, 1, 10000)
  const pageSize = parsePositiveInt(rawQuery.pageSize, OWNER_DASHBOARD_DEFAULT_PAGE_SIZE, 1, OWNER_DASHBOARD_MAX_PAGE_SIZE)

  const range = resolveOwnerDashboardRange(period, rawQuery.startAt, rawQuery.endAt, now)
  if (range.error) return { error: range.error }

  return {
    value: {
      q,
      category,
      manufacturer,
      status,
      sortBy,
      direction,
      page,
      pageSize,
      period: range.value.period,
      startAt: range.value.startAt,
      endAt: range.value.endAt,
      daysRange: range.value.daysRange,
    },
  }
}

function parseOwnerDashboardStatus(value) {
  const normalized = String(value || 'all').trim().toLowerCase()
  const allowed = new Set(['all', 'active', 'draft', 'inactive', 'out-of-stock', 'critical', 'missing-image'])
  return allowed.has(normalized) ? normalized : 'all'
}

function parseOwnerDashboardSort(value) {
  const normalized = String(value || 'revenue').trim()
  const allowed = new Set(['sku', 'name', 'price', 'cost', 'margin', 'stock', 'unitsSold', 'revenue', 'conversion', 'rating', 'status', 'updatedAt'])
  return allowed.has(normalized) ? normalized : 'revenue'
}

function parseOwnerDashboardDirection(value) {
  const normalized = String(value || 'desc').trim().toLowerCase()
  return normalized === 'asc' ? 'asc' : 'desc'
}

function resolveOwnerDashboardRange(period, rawStartAt, rawEndAt, nowDate) {
  const now = new Date(nowDate)
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const supportedPeriods = new Set(['day', 'week', 'month', 'custom'])
  const safePeriod = supportedPeriods.has(period) ? period : 'month'

  if (safePeriod === 'custom') {
    const parsedStart = parseIsoDate(rawStartAt)
    const parsedEnd = parseIsoDate(rawEndAt)
    if (!parsedStart || !parsedEnd) return { error: 'Periodo custom exige startAt e endAt validos.' }
    if (parsedStart > parsedEnd) return { error: 'Periodo custom invalido: startAt maior que endAt.' }
    const normalizedStart = new Date(parsedStart)
    normalizedStart.setHours(0, 0, 0, 0)
    const normalizedEnd = new Date(parsedEnd)
    normalizedEnd.setHours(23, 59, 59, 999)
    const daysRange = Math.max(1, Math.ceil((normalizedEnd.getTime() - normalizedStart.getTime()) / 86400000) + 1)
    return {
      value: {
        period: safePeriod,
        startAt: normalizedStart.toISOString(),
        endAt: normalizedEnd.toISOString(),
        daysRange,
      },
    }
  }

  const start = new Date(startOfDay)
  if (safePeriod === 'day') {
    start.setDate(start.getDate() - 1)
  } else if (safePeriod === 'week') {
    start.setDate(start.getDate() - 6)
  } else {
    start.setDate(start.getDate() - 29)
  }

  const daysRange = Math.max(1, Math.ceil((endOfDay.getTime() - start.getTime()) / 86400000) + 1)
  return {
    value: {
      period: safePeriod,
      startAt: start.toISOString(),
      endAt: endOfDay.toISOString(),
      daysRange,
    },
  }
}

function derivePreviousRange(startAt, endAt) {
  const currentStart = new Date(startAt)
  const currentEnd = new Date(endAt)
  const durationMs = Math.max(1, currentEnd.getTime() - currentStart.getTime())
  const previousEnd = new Date(currentStart.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - durationMs)
  const daysRange = Math.max(1, Math.ceil((previousEnd.getTime() - previousStart.getTime()) / 86400000) + 1)
  return {
    startAt: previousStart.toISOString(),
    endAt: previousEnd.toISOString(),
    daysRange,
  }
}

function parseIsoDate(value) {
  const safe = String(value || '').trim()
  if (!safe) return null
  const parsed = new Date(safe)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

async function queryOwnerDashboardProductAnalytics(filters) {
  const params = []
  const addParam = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  const nowBind = addParam(nowIso())
  const startBind = addParam(filters.startAt)
  const endBind = addParam(filters.endAt)

  const where = []
  if (filters.q) {
    const term = addParam(`%${filters.q}%`)
    where.push(`(lower(p.name) LIKE ${term} OR lower(p.sku) LIKE ${term} OR lower(m.name) LIKE ${term} OR lower(c.name) LIKE ${term})`)
  }
  if (filters.category) {
    where.push(`lower(c.name) = ${addParam(filters.category.toLowerCase())}`)
  }
  if (filters.manufacturer) {
    where.push(`lower(m.name) = ${addParam(filters.manufacturer.toLowerCase())}`)
  }

  switch (filters.status) {
    case 'active':
      where.push('p.is_active = TRUE')
      break
    case 'draft':
    case 'inactive':
      where.push('p.is_active = FALSE')
      break
    case 'out-of-stock':
      where.push('st.quantity <= 0')
      break
    case 'critical':
      where.push('st.quantity <= p.minimum_stock')
      break
    case 'missing-image':
      where.push("p.is_active = TRUE AND COALESCE(main_image.url, '') = ''")
      break
    default:
      break
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `
    SELECT
      p.id,
      p.sku,
      p.name,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      pr.price,
      p.cost,
      p.minimum_stock AS "minimumStock",
      p.reorder_point AS "reorderPoint",
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(sales.units_sold, 0)::int AS "unitsSold",
      COALESCE(sales.revenue, 0)::numeric(12,2) AS revenue,
      COALESCE(sales.order_count, 0)::int AS "orderCount",
      sales.last_sale_at AS "lastSaleAt",
      COALESCE(events.views, 0)::int AS views,
      COALESCE(events.clicks, 0)::int AS clicks,
      COALESCE(events.add_to_cart, 0)::int AS "addToCart",
      COALESCE(events.checkout_start, 0)::int AS "checkoutStart",
      COALESCE(events.purchase, 0)::int AS purchase,
      COALESCE(review.avg_rating, 0)::numeric(10,2) AS "averageRating",
      COALESCE(review.review_count, 0)::int AS "reviewCount",
      COALESCE(return_data.returned_units, 0)::int AS "returnedUnits",
      COALESCE(return_data.return_count, 0)::int AS "returnCount",
      COALESCE(complaint_data.open_complaints, 0)::int AS "openComplaints",
      active_offer.compare_at_price AS "compareAtPrice",
      active_offer.badge AS "offerBadge",
      active_offer.ends_at AS "offerEndsAt",
      CASE
        WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
          THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100)
        ELSE 0
      END AS "discountPercent"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN (
      SELECT
        oi.product_id,
        SUM(oi.quantity)::int AS units_sold,
        SUM(oi.line_total)::numeric(12,2) AS revenue,
        COUNT(DISTINCT oi.order_id)::int AS order_count,
        MAX(o.created_at) AS last_sale_at
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${startBind}
        AND o.created_at <= ${endBind}
        AND o.status <> 'cancelled'
      GROUP BY oi.product_id
    ) sales ON sales.product_id = p.id
    LEFT JOIN (
      SELECT
        pe.product_id,
        SUM(CASE WHEN pe.event_type = 'view' THEN pe.quantity ELSE 0 END)::int AS views,
        SUM(CASE WHEN pe.event_type = 'click' THEN pe.quantity ELSE 0 END)::int AS clicks,
        SUM(CASE WHEN pe.event_type = 'add_to_cart' THEN pe.quantity ELSE 0 END)::int AS add_to_cart,
        SUM(CASE WHEN pe.event_type = 'checkout_start' THEN pe.quantity ELSE 0 END)::int AS checkout_start,
        SUM(CASE WHEN pe.event_type = 'purchase' THEN pe.quantity ELSE 0 END)::int AS purchase
      FROM product_events pe
      WHERE pe.created_at >= ${startBind}
        AND pe.created_at <= ${endBind}
      GROUP BY pe.product_id
    ) events ON events.product_id = p.id
    LEFT JOIN (
      SELECT
        r.product_id,
        AVG(r.rating)::numeric(10,2) AS avg_rating,
        COUNT(*)::int AS review_count
      FROM reviews r
      WHERE r.is_public = TRUE
      GROUP BY r.product_id
    ) review ON review.product_id = p.id
    LEFT JOIN (
      SELECT
        pr.product_id,
        SUM(pr.quantity)::int AS returned_units,
        COUNT(*)::int AS return_count
      FROM product_returns pr
      WHERE pr.created_at >= ${startBind}
        AND pr.created_at <= ${endBind}
      GROUP BY pr.product_id
    ) return_data ON return_data.product_id = p.id
    LEFT JOIN (
      SELECT
        cc.product_id,
        COUNT(*)::int AS open_complaints
      FROM customer_complaints cc
      WHERE cc.created_at >= ${startBind}
        AND cc.created_at <= ${endBind}
        AND cc.status IN ('open', 'in_progress')
      GROUP BY cc.product_id
    ) complaint_data ON complaint_data.product_id = p.id
    LEFT JOIN LATERAL (
      SELECT o.compare_at_price, o.badge, o.ends_at
      FROM offers o
      WHERE o.product_id = p.id
        AND o.is_active = TRUE
        AND (o.starts_at IS NULL OR o.starts_at <= ${nowBind})
        AND (o.ends_at IS NULL OR o.ends_at >= ${nowBind})
      ORDER BY o.updated_at DESC, o.id DESC
      LIMIT 1
    ) active_offer ON TRUE
    ${whereSql}
  `

  const result = await query(sql, params)
  return result.rows.map((row) => normalizeOwnerDashboardProductRow(row, filters.daysRange))
}

function normalizeOwnerDashboardProductRow(row, daysRange) {
  const price = Number(row.price || 0)
  const cost = Number(row.cost || 0)
  const stock = Number(row.stock || 0)
  const minimumStock = Number(row.minimumStock || 0)
  const reorderPoint = Number(row.reorderPoint || 0)
  const unitsSold = Number(row.unitsSold || 0)
  const revenue = Number(row.revenue || 0)
  const orderCount = Number(row.orderCount || 0)
  const views = Number(row.views || 0)
  const clicks = Number(row.clicks || 0)
  const addToCart = Number(row.addToCart || 0)
  const checkoutStart = Number(row.checkoutStart || 0)
  const purchasesFromEvents = Number(row.purchase || 0)
  const purchases = Math.max(unitsSold, purchasesFromEvents)
  const averageRating = Number(Number(row.averageRating || 0).toFixed(2))
  const reviewCount = Number(row.reviewCount || 0)
  const returnedUnits = Number(row.returnedUnits || 0)
  const returnCount = Number(row.returnCount || 0)
  const openComplaints = Number(row.openComplaints || 0)
  const compareAtPrice = row.compareAtPrice === null || row.compareAtPrice === undefined ? null : Number(row.compareAtPrice)
  const discountPercent = Number(row.discountPercent || 0)
  const marginPercent = price > 0 ? Number((((price - cost) / price) * 100).toFixed(2)) : 0
  const markupPercent = cost > 0 ? Number((((price - cost) / cost) * 100).toFixed(2)) : 0
  const grossProfit = Number(((price - cost) * unitsSold).toFixed(2))
  const conversionRate = views > 0 ? Number(((purchases / views) * 100).toFixed(2)) : 0
  const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0
  const addToCartRateBase = clicks > 0 ? clicks : views
  const addToCartRate = addToCartRateBase > 0 ? Number(((addToCart / addToCartRateBase) * 100).toFixed(2)) : 0
  const checkoutAbandonmentRate = checkoutStart > 0
    ? Number((((Math.max(checkoutStart - purchases, 0)) / checkoutStart) * 100).toFixed(2))
    : 0
  const sellThroughRate = (unitsSold + stock) > 0 ? Number(((unitsSold / (unitsSold + stock)) * 100).toFixed(2)) : 0
  const returnRate = unitsSold > 0 ? Number(((returnedUnits / unitsSold) * 100).toFixed(2)) : 0
  const avgDailySales = daysRange > 0 ? (unitsSold / daysRange) : 0
  const daysOfInventory = avgDailySales > 0 ? Number((stock / avgDailySales).toFixed(1)) : null
  const hasImage = String(row.imageUrl || '').trim().length > 0
  const isActive = Boolean(row.isActive)

  let stockHealth = 'healthy'
  if (stock <= minimumStock) stockHealth = 'critical'
  else if (stock <= reorderPoint) stockHealth = 'low'

  let status = 'draft'
  if (isActive && hasImage && stock > 0) status = 'active'
  else if (isActive && !hasImage) status = 'missing-image'
  else if (isActive && stock <= 0) status = 'out-of-stock'
  else if (!isActive) status = 'inactive'

  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    manufacturer: row.manufacturer,
    category: row.category,
    categoryId: Number(row.categoryId),
    bikeModel: row.bikeModel,
    isActive,
    status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    imageUrl: row.imageUrl || '',
    price,
    cost,
    marginPercent,
    markupPercent,
    grossProfit,
    stock,
    minimumStock,
    reorderPoint,
    stockHealth,
    unitsSold,
    orderCount,
    revenue,
    views,
    clicks,
    addToCart,
    checkoutStart,
    purchases,
    ctr,
    addToCartRate,
    checkoutAbandonmentRate,
    conversionRate,
    averageRating,
    reviewCount,
    returnRate,
    returnedUnits,
    returnCount,
    openComplaints,
    lastSaleAt: row.lastSaleAt || null,
    sellThroughRate,
    daysOfInventory,
    compareAtPrice,
    offerBadge: row.offerBadge || null,
    offerEndsAt: row.offerEndsAt || null,
    hasOffer: compareAtPrice !== null,
    discountPercent,
  }
}

function mapOwnerDashboardProductRow(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    manufacturer: row.manufacturer,
    category: row.category,
    bikeModel: row.bikeModel,
    price: row.price,
    cost: row.cost,
    marginPercent: row.marginPercent,
    markupPercent: row.markupPercent,
    grossProfit: row.grossProfit,
    stock: row.stock,
    minimumStock: row.minimumStock,
    reorderPoint: row.reorderPoint,
    stockHealth: row.stockHealth,
    unitsSold: row.unitsSold,
    orderCount: row.orderCount,
    revenue: row.revenue,
    conversionRate: row.conversionRate,
    averageRating: row.averageRating,
    reviewCount: row.reviewCount,
    returnRate: row.returnRate,
    returnedUnits: row.returnedUnits,
    returnCount: row.returnCount,
    openComplaints: row.openComplaints,
    views: row.views,
    clicks: row.clicks,
    addToCart: row.addToCart,
    checkoutStart: row.checkoutStart,
    purchases: row.purchases,
    ctr: row.ctr,
    addToCartRate: row.addToCartRate,
    checkoutAbandonmentRate: row.checkoutAbandonmentRate,
    sellThroughRate: row.sellThroughRate,
    daysOfInventory: row.daysOfInventory,
    status: row.status,
    isActive: row.isActive,
    imageUrl: row.imageUrl,
    hasOffer: row.hasOffer,
    compareAtPrice: row.compareAtPrice,
    discountPercent: row.discountPercent,
    offerBadge: row.offerBadge,
    offerEndsAt: row.offerEndsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSaleAt: row.lastSaleAt,
  }
}

function sortOwnerDashboardProducts(items, sortBy, direction) {
  const factor = direction === 'asc' ? 1 : -1
  const statusRank = { active: 1, critical: 2, low: 3, 'out-of-stock': 4, 'missing-image': 5, draft: 6, inactive: 7 }

  const getValue = (row) => {
    switch (sortBy) {
      case 'sku':
        return row.sku
      case 'name':
        return row.name
      case 'price':
        return row.price
      case 'cost':
        return row.cost
      case 'margin':
        return row.marginPercent
      case 'stock':
        return row.stock
      case 'unitsSold':
        return row.unitsSold
      case 'conversion':
        return row.conversionRate
      case 'rating':
        return row.averageRating
      case 'status':
        return statusRank[row.status] || 99
      case 'updatedAt':
        return new Date(row.updatedAt).getTime()
      case 'revenue':
      default:
        return row.revenue
    }
  }

  return [...items].sort((a, b) => {
    const aValue = getValue(a)
    const bValue = getValue(b)
    if (typeof aValue === 'string' || typeof bValue === 'string') {
      return String(aValue).localeCompare(String(bValue), 'pt-BR') * factor
    }
    if (aValue === bValue) return String(a.name).localeCompare(String(b.name), 'pt-BR')
    return (Number(aValue) - Number(bValue)) * factor
  })
}

async function buildOwnerDashboardMetrics(rows, previousRows = []) {
  const current = summarizeOwnerDashboardMetrics(rows)
  const previous = summarizeOwnerDashboardMetrics(previousRows)
  const metricDelta = {
    revenueTotal: calculatePercentDelta(current.revenueTotal, previous.revenueTotal),
    ticketAverage: calculatePercentDelta(current.ticketAverage, previous.ticketAverage),
    unitsSold: calculatePercentDelta(current.unitsSold, previous.unitsSold),
    averageMargin: calculatePercentDelta(current.averageMargin, previous.averageMargin),
    averageConversion: calculatePercentDelta(current.averageConversion, previous.averageConversion),
    outOfStockProducts: calculatePercentDelta(current.outOfStockProducts, previous.outOfStockProducts),
    criticalStockProducts: calculatePercentDelta(current.criticalStockProducts, previous.criticalStockProducts),
    averageRating: calculatePercentDelta(current.averageRating, previous.averageRating),
  }
  return {
    ...current,
    metricDelta,
  }
}

function summarizeOwnerDashboardMetrics(rows) {
  const totalProducts = rows.length
  const activeProducts = rows.filter((row) => row.isActive).length
  const inactiveProducts = rows.filter((row) => !row.isActive).length
  const outOfStockProducts = rows.filter((row) => row.stock <= 0).length
  const criticalStockProducts = rows.filter((row) => row.stockHealth === 'critical').length
  const lowStockProducts = rows.filter((row) => row.stockHealth === 'low' || row.stockHealth === 'critical').length
  const stockTotal = rows.reduce((sum, row) => sum + row.stock, 0)
  const unitsSold = rows.reduce((sum, row) => sum + row.unitsSold, 0)
  const revenueTotal = Number(rows.reduce((sum, row) => sum + row.revenue, 0).toFixed(2))
  const grossProfitTotal = Number(rows.reduce((sum, row) => sum + row.grossProfit, 0).toFixed(2))
  const ordersTotal = rows.reduce((sum, row) => sum + row.orderCount, 0)
  const averagePrice = totalProducts > 0 ? Number((rows.reduce((sum, row) => sum + row.price, 0) / totalProducts).toFixed(2)) : 0
  const averageMargin = totalProducts > 0 ? Number((rows.reduce((sum, row) => sum + row.marginPercent, 0) / totalProducts).toFixed(2)) : 0
  const averageConversion = totalProducts > 0 ? Number((rows.reduce((sum, row) => sum + row.conversionRate, 0) / totalProducts).toFixed(2)) : 0
  const ticketAverage = ordersTotal > 0 ? Number((revenueTotal / ordersTotal).toFixed(2)) : 0
  const productsMissingImage = rows.filter((row) => row.isActive && !row.imageUrl).length
  const activeOffers = rows.filter((row) => row.hasOffer).length
  const totalComments = rows.reduce((sum, row) => sum + row.reviewCount, 0)
  const totalReturns = rows.reduce((sum, row) => sum + Number(row.returnCount || 0), 0)
  const returnedUnits = rows.reduce((sum, row) => sum + Number(row.returnedUnits || 0), 0)
  const openComplaints = rows.reduce((sum, row) => sum + Number(row.openComplaints || 0), 0)
  const reviewedRows = rows.filter((row) => row.reviewCount > 0)
  const averageRating = reviewedRows.length > 0 ? Number((reviewedRows.reduce((sum, row) => sum + row.averageRating, 0) / reviewedRows.length).toFixed(2)) : 0

  return {
    totalProducts,
    activeProducts,
    inactiveProducts,
    outOfStockProducts,
    criticalStockProducts,
    lowStockProducts,
    stockTotal,
    unitsSold,
    revenueTotal,
    grossProfitTotal,
    ticketAverage,
    averagePrice,
    averageMargin,
    averageConversion,
    productsMissingImage,
    totalOffers: activeOffers,
    activeOffers,
    totalComments,
    averageRating,
    totalReturns,
    returnedUnits,
    openComplaints,
  }
}

function calculatePercentDelta(current, previous) {
  const safeCurrent = Number(current || 0)
  const safePrevious = Number(previous || 0)
  if (safePrevious === 0) {
    if (safeCurrent === 0) return 0
    return 100
  }
  return Number((((safeCurrent - safePrevious) / Math.abs(safePrevious)) * 100).toFixed(2))
}

function buildOwnerDashboardRankings(rows) {
  const simplify = (row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    manufacturer: row.manufacturer,
    stock: row.stock,
    price: row.price,
    revenue: row.revenue,
    unitsSold: row.unitsSold,
    marginPercent: row.marginPercent,
    conversionRate: row.conversionRate,
    returnRate: row.returnRate,
    averageRating: row.averageRating,
    reviewCount: row.reviewCount,
  })

  return {
    topRevenue: [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(simplify),
    topUnits: [...rows].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10).map(simplify),
    topMargin: [...rows].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 10).map(simplify),
    highReturnRate: [...rows].sort((a, b) => b.returnRate - a.returnRate).slice(0, 10).map(simplify),
    lowConversion: [...rows]
      .filter((row) => row.views > 0)
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 10)
      .map(simplify),
  }
}

function buildOwnerDashboardInventory(rows, daysRange) {
  const now = Date.now()
  const stagnantThresholdDays = Math.max(30, daysRange)
  const mapItem = (row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    stock: row.stock,
    minimumStock: row.minimumStock,
    reorderPoint: row.reorderPoint,
    unitsSold: row.unitsSold,
    daysOfInventory: row.daysOfInventory,
    sellThroughRate: row.sellThroughRate,
    lastSaleAt: row.lastSaleAt,
  })

  const criticalStock = rows
    .filter((row) => row.stock <= row.minimumStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 20)
    .map(mapItem)

  const lowStock = rows
    .filter((row) => row.stock > row.minimumStock && row.stock <= row.reorderPoint)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 20)
    .map(mapItem)

  const stagnant = rows
    .filter((row) => {
      const referenceDate = row.lastSaleAt ? new Date(row.lastSaleAt).getTime() : new Date(row.createdAt).getTime()
      const daysWithoutSales = Math.floor((now - referenceDate) / 86400000)
      return row.unitsSold <= 0 && daysWithoutSales >= stagnantThresholdDays
    })
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 20)
    .map(mapItem)

  const overstock = rows
    .filter((row) => row.stock > Math.max(row.reorderPoint * 3, row.minimumStock + 20) && row.unitsSold <= 2)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 20)
    .map(mapItem)

  return { criticalStock, lowStock, stagnant, overstock }
}

function buildOwnerDashboardFunnel(rows) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.views += row.views
      acc.clicks += row.clicks
      acc.addToCart += row.addToCart
      acc.checkoutStart += row.checkoutStart
      acc.purchases += row.purchases
      return acc
    },
    { views: 0, clicks: 0, addToCart: 0, checkoutStart: 0, purchases: 0 },
  )

  const ctr = totals.views > 0 ? Number(((totals.clicks / totals.views) * 100).toFixed(2)) : 0
  const addToCartRate = totals.clicks > 0 ? Number(((totals.addToCart / totals.clicks) * 100).toFixed(2)) : 0
  const purchaseRate = totals.views > 0 ? Number(((totals.purchases / totals.views) * 100).toFixed(2)) : 0
  const abandonmentRate = totals.checkoutStart > 0
    ? Number((((Math.max(totals.checkoutStart - totals.purchases, 0)) / totals.checkoutStart) * 100).toFixed(2))
    : 0

  return {
    ...totals,
    ctr,
    addToCartRate,
    purchaseRate,
    abandonmentRate,
  }
}

function buildOwnerDashboardFacets(rows) {
  const categories = Array.from(new Set(rows.map((row) => String(row.category || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
  const manufacturers = Array.from(new Set(rows.map((row) => String(row.manufacturer || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
  const statuses = Array.from(new Set(rows.map((row) => String(row.status || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )

  return {
    categories,
    manufacturers,
    statuses,
  }
}

async function queryOwnerDashboardTrend(filters, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) return []
  const rows = await query(
    `SELECT
      DATE_TRUNC('day', o.created_at)::date AS day,
      SUM(oi.line_total)::numeric(12,2) AS revenue,
      SUM(oi.quantity)::int AS units
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = ANY($1::bigint[])
       AND o.created_at >= $2
       AND o.created_at <= $3
       AND o.status <> 'cancelled'
     GROUP BY day
     ORDER BY day ASC`,
    [productIds, filters.startAt, filters.endAt],
  )

  const mapByDay = new Map(
    rows.rows.map((row) => [
      String(row.day),
      { date: String(row.day), revenue: Number(row.revenue || 0), units: Number(row.units || 0) },
    ]),
  )

  const output = []
  const cursor = new Date(filters.startAt)
  const end = new Date(filters.endAt)
  cursor.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    output.push(mapByDay.get(key) || { date: key, revenue: 0, units: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return output
}

async function queryOwnerDashboardQuality(filters, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { topReturnReasons: [], complaintsBySeverity: [], complaintsOpen: 0 }
  }

  const [reasons, complaintSeverity, openComplaints] = await Promise.all([
    query(
      `SELECT
         COALESCE(rrc.label, 'Sem motivo') AS label,
         COUNT(*)::int AS total
       FROM product_returns pr
       LEFT JOIN return_reason_catalog rrc ON rrc.code = pr.reason_code
       WHERE pr.product_id = ANY($1::bigint[])
         AND pr.created_at >= $2
         AND pr.created_at <= $3
       GROUP BY label
       ORDER BY total DESC
       LIMIT 8`,
      [productIds, filters.startAt, filters.endAt],
    ),
    query(
      `SELECT
         severity,
         COUNT(*)::int AS total
       FROM customer_complaints
       WHERE product_id = ANY($1::bigint[])
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY severity
       ORDER BY total DESC`,
      [productIds, filters.startAt, filters.endAt],
    ),
    queryOne(
      `SELECT COUNT(*)::int AS total
       FROM customer_complaints
       WHERE product_id = ANY($1::bigint[])
         AND created_at >= $2
         AND created_at <= $3
         AND status IN ('open', 'in_progress')`,
      [productIds, filters.startAt, filters.endAt],
    ),
  ])

  return {
    topReturnReasons: reasons.rows.map((row) => ({ label: row.label, total: Number(row.total || 0) })),
    complaintsBySeverity: complaintSeverity.rows.map((row) => ({ severity: row.severity, total: Number(row.total || 0) })),
    complaintsOpen: Number(openComplaints?.total || 0),
  }
}

async function trackProductEvent(productId, eventType, quantity = 1, tx = null) {
  const safeProductId = Number(productId)
  const safeQuantity = Number(quantity)
  const safeEventType = String(eventType || '').trim()
  if (!Number.isInteger(safeProductId) || safeProductId <= 0) return
  if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) return
  if (!['view', 'click', 'add_to_cart', 'checkout_start', 'purchase'].includes(safeEventType)) return

  const executor = tx || { query }
  try {
    await executor.query(
      `INSERT INTO product_events (product_id, event_type, quantity, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [safeProductId, safeEventType, safeQuantity],
    )
  } catch (error) {
    console.warn('Falha ao registrar evento de produto:', error?.message || error)
  }
}

async function trackProductEvents(productIds, eventType) {
  const ids = Array.from(new Set(
    (Array.isArray(productIds) ? productIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0),
  ))

  if (ids.length === 0) return
  const safeEventType = String(eventType || '').trim()
  if (!['view', 'click', 'add_to_cart', 'checkout_start', 'purchase'].includes(safeEventType)) return

  try {
    await query(
      `INSERT INTO product_events (product_id, event_type, quantity, created_at)
       SELECT UNNEST($1::bigint[]), $2, 1, NOW()`,
      [ids, safeEventType],
    )
  } catch (error) {
    console.warn('Falha ao registrar lote de eventos de produto:', error?.message || error)
  }
}
function mapProductRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    sku: row.sku,
    manufacturer: row.manufacturer,
    category: row.category,
    bikeModel: row.bikeModel,
    price: Number(row.price),
    stock: Number(row.stock),
    imageUrl: row.imageUrl || '',
    hoverImageUrl: row.hoverImageUrl || '',
    description: row.description || '',
    cost: row.cost === null || row.cost === undefined ? 0 : Number(row.cost),
    minimumStock: Number(row.minimumStock ?? row.minimum_stock ?? 5),
    reorderPoint: Number(row.reorderPoint ?? row.reorder_point ?? 10),
    seoSlug: row.seoSlug || row.seo_slug || '',
    seoMetaTitle: row.seoMetaTitle || row.seo_meta_title || '',
    seoMetaDescription: row.seoMetaDescription || row.seo_meta_description || '',
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    totalSold: Number(row.totalSold || 0),
    compareAtPrice: row.compareAtPrice === null || row.compareAtPrice === undefined ? null : Number(row.compareAtPrice),
    offerBadge: row.offerBadge || null,
    offerEndsAt: row.offerEndsAt || null,
    discountPercent: Number(row.discountPercent || 0),
  }
}

function mapOfferRow(row) {
  return {
    id: Number(row.id),
    productId: Number(row.productId),
    badge: row.badge,
    description: row.description,
    compareAtPrice: Number(row.compareAtPrice),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    updatedAt: row.updatedAt,
    name: row.name,
    sku: row.sku,
    manufacturer: row.manufacturer,
    category: row.category,
    bikeModel: row.bikeModel,
    price: Number(row.price),
    stock: Number(row.stock),
    imageUrl: row.imageUrl || '',
    hoverImageUrl: row.hoverImageUrl || '',
    productDescription: row.productDescription,
    isActive: Boolean(row.isActive),
    discountPercent: Number(row.discountPercent || 0),
  }
}

function mapOwnerOfferRow(row) {
  return {
    id: Number(row.id),
    productId: Number(row.productId),
    badge: row.badge,
    description: row.description,
    compareAtPrice: Number(row.compareAtPrice),
    isActive: Boolean(row.isActive),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    productName: row.productName,
    productSku: row.productSku,
    productPrice: Number(row.productPrice),
    productStock: Number(row.productStock),
    productIsActive: Boolean(row.productIsActive),
  }
}

function productOfferSelectSql() {
  return `
    SELECT
      o.id,
      o.product_id AS "productId",
      o.badge,
      o.description,
      o.compare_at_price AS "compareAtPrice",
      o.starts_at AS "startsAt",
      o.ends_at AS "endsAt",
      o.updated_at AS "updatedAt",
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description AS "productDescription",
      p.is_active AS "isActive",
      CASE WHEN o.compare_at_price > pr.price THEN ROUND(((o.compare_at_price - pr.price) / o.compare_at_price) * 100) ELSE 0 END AS "discountPercent"
    FROM offers o
    JOIN products p ON p.id = o.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE`
}

function ownerOfferSelectSql() {
  return `
    SELECT
      o.id,
      o.product_id AS "productId",
      o.badge,
      o.description,
      o.compare_at_price AS "compareAtPrice",
      o.is_active AS "isActive",
      o.starts_at AS "startsAt",
      o.ends_at AS "endsAt",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      p.name AS "productName",
      p.sku AS "productSku",
      pr.price AS "productPrice",
      st.quantity AS "productStock",
      p.is_active AS "productIsActive"
    FROM offers o
    JOIN products p ON p.id = o.product_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE`
}

async function getOfferById(id) {
  const row = await queryOne(`${ownerOfferSelectSql()} WHERE o.id = $1 LIMIT 1`, [id])
  return row ? mapOwnerOfferRow(row) : null
}
async function listProductsFromQuery(rawQuery) {
  const now = nowIso()
  const q = String(rawQuery.q || '').trim().toLowerCase()
  const category = String(rawQuery.category || '').trim().toLowerCase()
  const manufacturer = String(rawQuery.manufacturer || '').trim().toLowerCase()
  const minPrice = parseOptionalNumber(rawQuery.minPrice)
  const maxPrice = parseOptionalNumber(rawQuery.maxPrice)
  const inStock = parseOptionalBoolean(rawQuery.inStock)
  const promo = parseOptionalBoolean(rawQuery.promo)
  const sort = parseProductSort(rawQuery.sort)
  const page = parsePositiveInt(rawQuery.page, 1, 1, 10000)
  const pageSize = parsePositiveInt(rawQuery.pageSize, 12, 1, 60)
  const onlyWithImage = parseBooleanWithDefault(rawQuery.onlyWithImage, true)

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: 'Faixa de preco invalida: minimo maior que maximo.' }
  }

  const params = []
  const addParam = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  const nowBind = addParam(now)
  const fromSql = `
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity)::int AS total_sold
      FROM order_items oi
      GROUP BY oi.product_id
    ) sales ON sales.product_id = p.id
    LEFT JOIN LATERAL (
      SELECT o.compare_at_price, o.badge, o.ends_at
      FROM offers o
      WHERE o.product_id = p.id
        AND o.is_active = TRUE
        AND (o.starts_at IS NULL OR o.starts_at <= ${nowBind})
        AND (o.ends_at IS NULL OR o.ends_at >= ${nowBind})
      LIMIT 1
    ) active_offer ON TRUE`

  const where = ['p.is_active = TRUE']
  if (onlyWithImage) where.push(`COALESCE(main_image.url, '') <> ''`)
  if (q) {
    const termBind = addParam(`%${q}%`)
    where.push(`(lower(p.name) LIKE ${termBind} OR lower(p.sku) LIKE ${termBind} OR lower(m.name) LIKE ${termBind} OR lower(c.name) LIKE ${termBind} OR lower(p.bike_model) LIKE ${termBind})`)
  }
  if (category) where.push(`lower(c.name) = ${addParam(category)}`)
  if (manufacturer) where.push(`lower(m.name) = ${addParam(manufacturer)}`)
  if (minPrice !== null) where.push(`pr.price >= ${addParam(minPrice)}`)
  if (maxPrice !== null) where.push(`pr.price <= ${addParam(maxPrice)}`)
  if (inStock === true) where.push('st.quantity > 0')
  else if (inStock === false) where.push('st.quantity <= 0')
  if (promo === true) where.push('active_offer.compare_at_price IS NOT NULL')
  else if (promo === false) where.push('active_offer.compare_at_price IS NULL')

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const orderBySql = getProductsOrderBy(sort)
  const offset = (page - 1) * pageSize

  const countSql = `SELECT COUNT(*)::int AS total ${fromSql} ${whereSql}`
  const dataParams = [...params]
  const limitBind = `$${dataParams.push(pageSize)}`
  const offsetBind = `$${dataParams.push(offset)}`

  const dataSql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description,
      p.seo_slug AS "seoSlug",
      p.seo_meta_title AS "seoMetaTitle",
      p.seo_meta_description AS "seoMetaDescription",
      p.cost,
      p.minimum_stock AS "minimumStock",
      p.reorder_point AS "reorderPoint",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      COALESCE(sales.total_sold, 0) AS "totalSold",
      active_offer.compare_at_price AS "compareAtPrice",
      active_offer.badge AS "offerBadge",
      active_offer.ends_at AS "offerEndsAt",
      CASE WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100) ELSE 0 END AS "discountPercent"
    ${fromSql}
    ${whereSql}
    ORDER BY ${orderBySql}
    LIMIT ${limitBind} OFFSET ${offsetBind}`

  const [countRow, dataRows] = await Promise.all([queryOne(countSql, params), query(dataSql, dataParams)])
  const total = Number(countRow?.total || 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return {
    payload: {
      items: dataRows.rows.map(mapProductRow),
      meta: { page, pageSize, total, totalPages },
    },
  }
}

function normalizeOptionalIso(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === '') return { value: null }
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return { error: `${fieldName} invalido.` }
  return { value: parsed.toISOString() }
}

function validateOfferPayload(body) {
  const input = body || {}
  const productId = Number(input.productId)
  const compareAtPrice = Number(input.compareAtPrice)
  const badge = String(input.badge || 'Oferta').trim()
  const description = String(input.description || '').trim()
  const isActive = ['false', '0'].includes(String(input.isActive).toLowerCase()) ? false : input.isActive === false ? false : true

  if (!Number.isInteger(productId) || productId <= 0) return { error: 'Produto da oferta invalido.' }
  if (!Number.isFinite(compareAtPrice) || compareAtPrice <= 0) return { error: 'Preco comparativo invalido.' }
  if (badge.length < 2 || badge.length > 40) return { error: 'Badge da oferta deve ter entre 2 e 40 caracteres.' }
  if (description.length > 240) return { error: 'Descricao da oferta deve ter no maximo 240 caracteres.' }

  const startsAt = normalizeOptionalIso(input.startsAt, 'Data de inicio')
  if (startsAt.error) return startsAt
  const endsAt = normalizeOptionalIso(input.endsAt, 'Data de fim')
  if (endsAt.error) return endsAt
  if (startsAt.value && endsAt.value && startsAt.value > endsAt.value) {
    return { error: 'Data de inicio deve ser anterior a data de fim.' }
  }
  return { value: { productId, compareAtPrice, badge, description, isActive, startsAt: startsAt.value, endsAt: endsAt.value } }
}
function validateProduct(body) {
  const input = body || {}
  const value = {
    name: String(input.name || '').trim(),
    sku: String(input.sku || '').trim().toUpperCase(),
    manufacturer: String(input.manufacturer || '').trim(),
    category: String(input.category || '').trim(),
    bikeModel: String(input.bikeModel || '').trim(),
    price: Number(input.price),
    cost: Number(input.cost ?? 0),
    stock: Number(input.stock),
    minimumStock: Number(input.minimumStock ?? 5),
    reorderPoint: Number(input.reorderPoint ?? 10),
    imageUrl: String(input.imageUrl || '').trim(),
    hoverImageUrl: String(input.hoverImageUrl || '').trim(),
    description: String(input.description || '').trim(),
    seoSlug: String(input.seoSlug || '').trim().toLowerCase(),
    seoMetaTitle: String(input.seoMetaTitle || '').trim(),
    seoMetaDescription: String(input.seoMetaDescription || '').trim(),
    isActive: ['false', '0'].includes(String(input.isActive).toLowerCase()) ? false : input.isActive === false ? false : true,
  }

  if (value.name.length < 3) return { error: 'Nome do produto deve ter ao menos 3 caracteres.' }
  if (value.sku.length < 3) return { error: 'SKU deve ter ao menos 3 caracteres.' }
  if (value.manufacturer.length < 2) return { error: 'Fabricante obrigatorio.' }
  if (value.category.length < 2) return { error: 'Categoria obrigatoria.' }
  if (value.bikeModel.length < 2) return { error: 'Modelo/aplicacao obrigatorio.' }
  if (!Number.isFinite(value.price) || value.price < 0) return { error: 'Preco invalido.' }
  if (!Number.isFinite(value.cost) || value.cost < 0) return { error: 'Custo invalido.' }
  if (value.cost > value.price && value.price > 0) return { error: 'Custo nao pode ser maior que o preco de venda.' }
  if (!Number.isInteger(value.stock) || value.stock < 0) return { error: 'Estoque invalido.' }
  if (!Number.isInteger(value.minimumStock) || value.minimumStock < 0) return { error: 'Estoque minimo invalido.' }
  if (!Number.isInteger(value.reorderPoint) || value.reorderPoint < 0) return { error: 'Ponto de reposicao invalido.' }
  if (value.reorderPoint < value.minimumStock) return { error: 'Ponto de reposicao deve ser maior ou igual ao estoque minimo.' }
  if (value.isActive && !value.imageUrl) return { error: 'Produto ativo precisa ter imagem principal valida para entrar na vitrine.' }
  if (value.imageUrl && !isValidProductImageUrl(value.imageUrl)) return { error: 'Imagem deve ser uma URL http(s) ou caminho iniciado por /.' }
  if (value.hoverImageUrl && !isValidProductImageUrl(value.hoverImageUrl)) return { error: 'Imagem hover deve ser uma URL http(s) ou caminho iniciado por /.' }
  if (value.seoSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.seoSlug)) {
    return { error: 'Slug SEO invalido. Use letras minusculas, numeros e hifens.' }
  }
  if (value.seoMetaTitle.length > 120) return { error: 'Meta title deve ter no maximo 120 caracteres.' }
  if (value.seoMetaDescription.length > 220) return { error: 'Meta description deve ter no maximo 220 caracteres.' }
  return { value }
}

function isValidProductImageUrl(url) {
  const isRelativePath = url.startsWith('/')
  const isHttpUrl = /^https?:\/\//i.test(url)
  if (!isRelativePath && !isHttpUrl) return false
  if (isHttpUrl) {
    try {
      new URL(url)
    } catch {
      return false
    }
  }
  return true
}

function resolveUploadExtension(file) {
  const byMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
  }
  const mime = String(file?.mimetype || '').toLowerCase()
  if (byMime[mime]) return byMime[mime]

  const ext = path.extname(String(file?.originalname || '')).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)) {
    return ext === '.jpeg' ? '.jpg' : ext
  }
  return '.jpg'
}

function buildPublicAssetUrl(req, storageKey) {
  const host = String(req.get('host') || '').trim()
  if (!host) return storageKey
  return `${req.protocol}://${host}${storageKey}`
}

async function ensureCategoryId(name, tx) {
  const row = await tx.one(
    `INSERT INTO categories (name, slug)
     VALUES ($1, $2)
     ON CONFLICT (name)
     DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [name, slugify(name)],
  )
  return Number(row.id)
}

async function ensureManufacturerId(name, tx) {
  const row = await tx.one(
    `INSERT INTO manufacturers (name)
     VALUES ($1)
     ON CONFLICT (name)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name],
  )
  return Number(row.id)
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function upsertProductImage(productId, kind, url, tx) {
  const clean = String(url || '').trim()
  if (!clean) {
    await tx.query('DELETE FROM product_images WHERE product_id = $1 AND kind = $2', [productId, kind])
    return
  }
  await tx.query(
    `INSERT INTO product_images (product_id, kind, url, sort_order)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (product_id, kind, sort_order)
     DO UPDATE SET url = EXCLUDED.url`,
    [productId, kind, clean],
  )
}

async function saveOwnerAuditLog(ownerUserId, payload, tx = null) {
  const safeOwnerUserId = Number(ownerUserId)
  if (!Number.isInteger(safeOwnerUserId) || safeOwnerUserId <= 0) return

  const actionType = String(payload?.actionType || '').trim().slice(0, 80)
  const entityType = String(payload?.entityType || '').trim().slice(0, 80)
  const entityId = parseOptionalPositiveInt(payload?.entityId)
  const before = payload?.before && typeof payload.before === 'object' ? payload.before : {}
  const after = payload?.after && typeof payload.after === 'object' ? payload.after : {}

  if (!actionType || !entityType) return

  const executor = tx || { query }
  try {
    await executor.query(
      `INSERT INTO owner_audit_logs (
        owner_user_id, action_type, entity_type, entity_id, before_json, after_json, created_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW())`,
      [safeOwnerUserId, actionType, entityType, entityId, JSON.stringify(before), JSON.stringify(after)],
    )
  } catch (error) {
    logger.warn('owner_audit_log_failed', {
      ownerUserId: safeOwnerUserId,
      actionType,
      entityType,
      entityId,
      error,
    })
  }
}

async function getPublicProductDetails(id) {
  const now = nowIso()
  const row = await queryOne(
    `SELECT
      p.id,
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description,
      p.seo_slug AS "seoSlug",
      p.seo_meta_title AS "seoMetaTitle",
      p.seo_meta_description AS "seoMetaDescription",
      p.cost,
      p.minimum_stock AS "minimumStock",
      p.reorder_point AS "reorderPoint",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      active_offer.compare_at_price AS "compareAtPrice",
      active_offer.badge AS "offerBadge",
      active_offer.ends_at AS "offerEndsAt",
      CASE
        WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
          THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100)
        ELSE 0
      END AS "discountPercent",
      COALESCE(reviews.total_reviews, 0) AS "totalReviews",
      COALESCE(reviews.average_rating, 0) AS "averageRating"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT o.compare_at_price, o.badge, o.ends_at
      FROM offers o
      WHERE o.product_id = p.id
        AND o.is_active = TRUE
        AND (o.starts_at IS NULL OR o.starts_at <= $2)
        AND (o.ends_at IS NULL OR o.ends_at >= $2)
      LIMIT 1
    ) active_offer ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(AVG(r.rating), 0)::numeric(4,2) AS average_rating
      FROM reviews r
      WHERE r.product_id = p.id
        AND r.is_public = TRUE
    ) reviews ON TRUE
    WHERE p.id = $1
      AND p.is_active = TRUE
    LIMIT 1`,
    [id, now],
  )

  if (!row) return null

  const [fitmentRows, imageRows] = await Promise.all([
    query(
      `SELECT
        v.brand,
        v.model,
        v.year_from AS "yearFrom",
        v.year_to AS "yearTo",
        pvf.notes
      FROM product_vehicle_fitment pvf
      JOIN vehicles v ON v.id = pvf.vehicle_id
      WHERE pvf.product_id = $1
      ORDER BY v.brand ASC, v.model ASC, v.year_from ASC NULLS LAST, v.year_to ASC NULLS LAST`,
      [id],
    ),
    query(
      `SELECT kind, url, sort_order
      FROM product_images
      WHERE product_id = $1
      ORDER BY
        CASE kind WHEN 'main' THEN 0 WHEN 'hover' THEN 1 ELSE 2 END,
        sort_order ASC,
        id ASC`,
      [id],
    ),
  ])

  const allImages = imageRows.rows.map((item) => String(item.url || '').trim()).filter(Boolean)
  const mainUrl = String(row.imageUrl || allImages[0] || '')
  const hoverUrl = String(row.hoverImageUrl || '')
  const extra = allImages.filter((image) => image !== mainUrl && image !== hoverUrl)
  const stock = Number(row.stock || 0)
  const discountPercent = Number(row.discountPercent || 0)

  const fitments = fitmentRows.rows.map((fitment) => {
    const brand = String(fitment.brand || '').trim()
    const model = String(fitment.model || '').trim()
    const yearFrom = fitment.yearFrom ? Number(fitment.yearFrom) : null
    const yearTo = fitment.yearTo ? Number(fitment.yearTo) : null
    const yearRange = yearFrom && yearTo
      ? `${yearFrom}-${yearTo}`
      : yearFrom
        ? `${yearFrom}+`
        : yearTo
          ? `ate ${yearTo}`
          : ''
    const notes = String(fitment.notes || '').trim()
    const labelParts = [`${brand} ${model}`.trim()]
    if (yearRange) labelParts.push(yearRange)
    if (notes) labelParts.push(notes)
    const label = labelParts.filter(Boolean).join(' • ')
    return { label, value: label || `${brand}-${model}`.toLowerCase() }
  }).filter((fitment) => Boolean(fitment.label))

  const urgencyLabel = stock <= 0
    ? 'Sem estoque'
    : stock <= 3
      ? 'Ultimas unidades'
      : null

  const seoSlug = String(row.seoSlug || slugify(row.name) || '')
  const metaTitle = String(row.seoMetaTitle || `${row.name} | Rodando Moto Center`)
  const metaDescription = String(row.seoMetaDescription || row.description || '').trim().slice(0, 220)

  return {
    item: mapProductRow(row),
    gallery: {
      mainUrl,
      hoverUrl,
      extra,
    },
    pricing: {
      price: Number(row.price || 0),
      compareAtPrice: row.compareAtPrice !== null && row.compareAtPrice !== undefined ? Number(row.compareAtPrice) : null,
      discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
    },
    availability: {
      stock,
      isActive: Boolean(row.isActive),
      urgencyLabel,
    },
    compatibility: {
      bikeModel: String(row.bikeModel || ''),
      fitments,
    },
    seo: {
      slug: seoSlug,
      metaTitle,
      metaDescription,
    },
    socialProof: {
      averageRating: Number(Number(row.averageRating || 0).toFixed(1)),
      totalReviews: Number(row.totalReviews || 0),
    },
  }
}

async function getProductById(id, tx = null) {
  const executor = tx || { query, one: queryOne }
  const row = await executor.one(
    `SELECT
      p.id,
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description,
      p.seo_slug AS "seoSlug",
      p.seo_meta_title AS "seoMetaTitle",
      p.seo_meta_description AS "seoMetaDescription",
      p.cost,
      p.minimum_stock AS "minimumStock",
      p.reorder_point AS "reorderPoint",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      0::int AS "totalSold",
      NULL::numeric AS "compareAtPrice",
      NULL::text AS "offerBadge",
      NULL::timestamptz AS "offerEndsAt",
      0::int AS "discountPercent"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE
    WHERE p.id = $1
    LIMIT 1`,
    [id],
  )
  return row ? mapProductRow(row) : null
}

async function getOrCreateOpenCart(actor, tx = null) {
  const executor = tx || { query, one: queryOne }
  const existing = actor.kind === 'user'
    ? await executor.one('SELECT * FROM carts WHERE user_id = $1 AND status = $2 LIMIT 1', [actor.userId, 'open'])
    : await executor.one('SELECT * FROM carts WHERE guest_token_hash = $1 AND status = $2 LIMIT 1', [actor.guestTokenHash, 'open'])
  if (existing) return existing

  return actor.kind === 'user'
    ? executor.one(`INSERT INTO carts (user_id, guest_token_hash, status, created_at, updated_at) VALUES ($1, NULL, 'open', NOW(), NOW()) RETURNING *`, [actor.userId])
    : executor.one(`INSERT INTO carts (user_id, guest_token_hash, status, created_at, updated_at) VALUES (NULL, $1, 'open', NOW(), NOW()) RETURNING *`, [actor.guestTokenHash])
}

async function getCartItemsByCartId(cartId, tx = null) {
  const executor = tx || { query, one: queryOne }
  const rows = await executor.query(
    `SELECT
      ci.product_id AS "productId",
      ci.quantity,
      p.name,
      p.sku,
      m.name AS manufacturer,
      c.name AS category,
      p.bike_model AS "bikeModel",
      pr.price,
      st.quantity AS stock,
      COALESCE(main_image.url, '') AS "imageUrl",
      COALESCE(hover_image.url, '') AS "hoverImageUrl",
      p.description,
      p.cost,
      p.is_active AS "isActive"
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN manufacturers m ON m.id = p.manufacturer_id
    JOIN product_stocks st ON st.product_id = p.id
    JOIN LATERAL (
      SELECT pp.price
      FROM product_prices pp
      WHERE pp.product_id = p.id AND pp.valid_to IS NULL
      ORDER BY pp.valid_from DESC, pp.id DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'main'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) main_image ON TRUE
    LEFT JOIN LATERAL (
      SELECT pi.url
      FROM product_images pi
      WHERE pi.product_id = p.id AND pi.kind = 'hover'
      ORDER BY pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) hover_image ON TRUE
    WHERE ci.cart_id = $1
    ORDER BY ci.updated_at DESC, ci.product_id DESC`,
    [cartId],
  )
  return rows.rows.map((row) => ({
    productId: Number(row.productId),
    quantity: Number(row.quantity),
    name: row.name,
    sku: row.sku,
    manufacturer: row.manufacturer,
    category: row.category,
    bikeModel: row.bikeModel,
    price: Number(row.price),
    stock: Number(row.stock),
    imageUrl: row.imageUrl || '',
    hoverImageUrl: row.hoverImageUrl || '',
    description: row.description || '',
    cost: Number(row.cost || 0),
    isActive: Boolean(row.isActive),
  }))
}

async function getBagItemsForActor(actor) {
  const cart = await getOrCreateOpenCart(actor)
  return getCartItemsByCartId(Number(cart.id))
}

async function getBagItemQuantity(actor, productId) {
  const cart = await getOrCreateOpenCart(actor)
  return queryOne('SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2', [Number(cart.id), productId])
}

async function upsertBagItem(actor, productId, quantity) {
  const cart = await getOrCreateOpenCart(actor)
  await query(
    `INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
    [Number(cart.id), productId, quantity],
  )
}

async function deleteBagItem(actor, productId) {
  const cart = await getOrCreateOpenCart(actor)
  await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [Number(cart.id), productId])
}

async function clearBagForActor(actor) {
  const cart = await getOrCreateOpenCart(actor)
  await query('DELETE FROM cart_items WHERE cart_id = $1', [Number(cart.id)])
}

async function mergeGuestBagToUser(guestTokenHash, userId) {
  const safeTokenHash = String(guestTokenHash || '').trim()
  const safeUserId = Number(userId)
  if (!safeTokenHash || !Number.isInteger(safeUserId) || safeUserId <= 0) return

  await withTransaction(async (tx) => {
    const guestCart = await tx.one('SELECT * FROM carts WHERE guest_token_hash = $1 AND status = $2 LIMIT 1', [safeTokenHash, 'open'])
    if (!guestCart) return

    const guestItems = await getCartItemsByCartId(Number(guestCart.id), tx)
    if (guestItems.length === 0) return

    const userCart = await getOrCreateOpenCart({ kind: 'user', userId: safeUserId }, tx)
    for (const guestItem of guestItems) {
      const product = await getProductById(guestItem.productId, tx)
      if (!product || !Boolean(product.isActive) || Number(product.stock) <= 0) continue

      const current = await tx.one('SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2', [Number(userCart.id), guestItem.productId])
      const nextQty = Math.min(Number(product.stock), Number(current?.quantity || 0) + Number(guestItem.quantity))
      if (nextQty <= 0) continue

      await tx.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (cart_id, product_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [Number(userCart.id), guestItem.productId, nextQty],
      )
    }

    await tx.query('DELETE FROM cart_items WHERE cart_id = $1', [Number(guestCart.id)])
    await tx.query('UPDATE carts SET status = $1, updated_at = NOW() WHERE id = $2', ['abandoned', Number(guestCart.id)])
  })
}

if (require.main === module) {
  startServer(PORT)
}

module.exports = {
  app,
  startServer,
}

