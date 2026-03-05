const crypto = require('node:crypto')
const {
  nowIso,
  query,
  queryOne,
} = require('./db')
const { getCookiePolicy } = require('./config/env')

const SESSION_COOKIE = 'rodando_session'
const GUEST_COOKIE = 'rodando_guest'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hashToken(token) {
  return sha256(token)
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash || '').split(':')
  if (!salt || !expected) return false

  const actual = crypto.scryptSync(password, salt, 64).toString('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(actual, 'hex')
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

function sanitizeUser(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || null,
    document: row.document || null,
    cep: row.cep || null,
    addressStreet: row.address_street || null,
    addressCity: row.address_city || null,
    addressState: row.address_state || null,
    createdAt: row.created_at,
  }
}

async function getRoleIdByCode(code) {
  const row = await queryOne('SELECT id FROM roles WHERE code = $1', [code])
  return row ? Number(row.id) : null
}

async function getUserByEmail(email) {
  return queryOne(
    `SELECT
      u.*,
      COALESCE(r.code, 'customer') AS role
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE lower(u.email) = lower($1)
    LIMIT 1`,
    [email],
  )
}

async function getUserById(id) {
  return queryOne(
    `SELECT
      u.*,
      COALESCE(r.code, 'customer') AS role
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = $1
    LIMIT 1`,
    [id],
  )
}

async function createUser({
  name,
  email,
  password,
  role = 'customer',
  phone = null,
  document = null,
  cep = null,
  addressStreet = null,
  addressCity = null,
  addressState = null,
}) {
  const timestamp = nowIso()
  const passwordHash = hashPassword(password)

  const created = await queryOne(
    `INSERT INTO users (name, email, password_hash, phone, document, cep, address_street, address_city, address_state, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      name,
      email.toLowerCase(),
      passwordHash,
      phone,
      document,
      cep,
      addressStreet,
      addressCity,
      addressState,
      timestamp,
      timestamp,
    ],
  )

  const roleId = await getRoleIdByCode(role)
  if (!roleId) {
    throw new Error(`Role ${role} nao encontrada.`)
  }

  await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [Number(created.id), roleId])
  return getUserById(Number(created.id))
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS)

  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4)',
    [userId, tokenHash, expiresAt.toISOString(), createdAt.toISOString()],
  )

  return {
    token,
    expiresAt,
  }
}

async function deleteSessionByToken(token) {
  if (!token) return
  await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
}

async function getUserFromSessionToken(token) {
  if (!token) return null
  return queryOne(
    `SELECT
      u.*,
      COALESCE(r.code, 'customer') AS role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE s.token_hash = $1 AND s.expires_at > $2
    LIMIT 1`,
    [hashToken(token), nowIso()],
  )
}

function setSessionCookie(res, token, expiresAt) {
  const cookiePolicy = getCookiePolicy()
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: cookiePolicy.sameSite,
    secure: cookiePolicy.secure,
    expires: expiresAt,
    path: '/',
  })
}

function clearSessionCookie(res) {
  const cookiePolicy = getCookiePolicy()
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: cookiePolicy.sameSite,
    secure: cookiePolicy.secure,
    path: '/',
  })
}

function setGuestCookie(res, token, expiresAt) {
  const cookiePolicy = getCookiePolicy()
  res.cookie(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: cookiePolicy.sameSite,
    secure: cookiePolicy.secure,
    expires: expiresAt,
    path: '/',
  })
}

function ensureGuestToken(req, res) {
  const existing = String(req.cookies?.[GUEST_COOKIE] || '').trim()
  if (existing.length >= 24) {
    return existing
  }

  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + GUEST_TTL_MS)
  setGuestCookie(res, token, expiresAt)
  return token
}

async function attachAuth(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE]
    const guestToken = ensureGuestToken(req, res)
    const user = await getUserFromSessionToken(token)

    req.auth = {
      token: token || null,
      user: sanitizeUser(user),
      guestToken,
      guestTokenHash: hashToken(guestToken),
    }
    return next()
  } catch (error) {
    return next(error)
  }
}

function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: 'Nao autenticado.' })
  }
  return next()
}

function requireOwner(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: 'Nao autenticado.' })
  }
  if (req.auth.user.role !== 'owner') {
    return res.status(403).json({ error: 'Acesso restrito ao owner.' })
  }
  return next()
}

module.exports = {
  GUEST_COOKIE,
  SESSION_COOKIE,
  attachAuth,
  clearSessionCookie,
  createSession,
  createUser,
  deleteSessionByToken,
  getUserByEmail,
  getUserFromSessionToken,
  requireAuth,
  requireOwner,
  sanitizeUser,
  hashToken,
  hashPassword,
  setSessionCookie,
  verifyPassword,
}
