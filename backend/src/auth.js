const crypto = require('node:crypto')
const { db, nowIso } = require('./db')

const SESSION_COOKIE = 'rodando_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
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
    createdAt: row.created_at,
  }
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email)
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

function createUser({ name, email, password, role }) {
  const timestamp = nowIso()
  const passwordHash = hashPassword(password)
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email.toLowerCase(), passwordHash, role, timestamp, timestamp)
  return getUserById(result.lastInsertRowid)
}

function countOwners() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'").get()
  return Number(row.count || 0)
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = sha256(token)
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS)

  db.prepare(
    'INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(userId, tokenHash, expiresAt.toISOString(), createdAt.toISOString())

  return {
    token,
    expiresAt,
  }
}

function deleteSessionByToken(token) {
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
}

function getUserFromSessionToken(token) {
  if (!token) return null
  const row = db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).get(sha256(token), nowIso())
  return row || null
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    expires: expiresAt,
    path: '/',
  })
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  })
}

function attachAuth(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  const user = getUserFromSessionToken(token)
  req.auth = {
    token: token || null,
    user: sanitizeUser(user),
  }
  next()
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
  SESSION_COOKIE,
  attachAuth,
  clearSessionCookie,
  countOwners,
  createSession,
  createUser,
  deleteSessionByToken,
  getUserByEmail,
  getUserFromSessionToken,
  requireAuth,
  requireOwner,
  sanitizeUser,
  setSessionCookie,
  verifyPassword,
}
