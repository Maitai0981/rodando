const crypto = require('node:crypto')
const { pool } = require('../db')
const { APP_ENV } = require('../config/env')

const SQL_MAX_LENGTH = Math.max(200, Number(process.env.OPS_SQL_MAX_LENGTH || 120000))
const SQL_TIMEOUT_MS = Math.max(500, Number(process.env.OPS_SQL_TIMEOUT_MS || 8000))
const SQL_RESULT_ROW_LIMIT = Math.max(20, Number(process.env.OPS_SQL_RESULT_ROW_LIMIT || 300))
const SQL_CHALLENGE_TTL_MS = Math.max(10_000, Number(process.env.OPS_SQL_CHALLENGE_TTL_MS || 60_000))
const CHALLENGE_CLEANUP_MAX = 500
const challengeStore = new Map()

function normalizeSql(sql) {
  return String(sql || '').trim()
}

function hashSql(sql) {
  return crypto.createHash('sha256').update(normalizeSql(sql)).digest('hex')
}

function requiresProductionChallenge(appEnv = APP_ENV) {
  return appEnv === 'production' || appEnv === 'staging'
}

function createChallengePhrase() {
  const code = crypto.randomInt(100000, 999999)
  return `CONFIRM-${code}`
}

function cleanupExpiredChallenges() {
  if (challengeStore.size <= CHALLENGE_CLEANUP_MAX) return
  const now = Date.now()
  for (const [challengeId, challenge] of challengeStore.entries()) {
    if (challenge.expiresAtMs <= now) challengeStore.delete(challengeId)
  }
}

function createSqlChallenge({ sql, userId, ttlMs = SQL_CHALLENGE_TTL_MS }) {
  const normalizedSql = normalizeSql(sql)
  if (!normalizedSql) {
    return { error: 'SQL obrigatorio.' }
  }
  if (normalizedSql.length > SQL_MAX_LENGTH) {
    return { error: `SQL excede limite de ${SQL_MAX_LENGTH} caracteres.` }
  }
  const ownerUserId = Number(userId)
  if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) {
    return { error: 'Usuario owner invalido para desafio SQL.' }
  }

  const phrase = createChallengePhrase()
  const challengeId = crypto.randomUUID()
  const expiresAtMs = Date.now() + Math.max(10_000, Number(ttlMs) || SQL_CHALLENGE_TTL_MS)
  const sqlHash = hashSql(normalizedSql)

  challengeStore.set(challengeId, {
    challengeId,
    ownerUserId,
    phraseHash: hashSql(phrase),
    sqlHash,
    expiresAtMs,
  })
  cleanupExpiredChallenges()

  return {
    challengeId,
    phrase,
    expiresAt: new Date(expiresAtMs).toISOString(),
    sqlHash,
  }
}

function verifySqlChallenge({ challengeId, phrase, sql, userId }) {
  const challenge = challengeStore.get(String(challengeId || '').trim())
  if (!challenge) return { ok: false, reason: 'challenge_not_found' }

  const now = Date.now()
  if (challenge.expiresAtMs <= now) {
    challengeStore.delete(challenge.challengeId)
    return { ok: false, reason: 'challenge_expired' }
  }

  const ownerUserId = Number(userId)
  if (ownerUserId !== challenge.ownerUserId) {
    return { ok: false, reason: 'challenge_owner_mismatch' }
  }

  const incomingPhraseHash = hashSql(String(phrase || '').trim())
  if (incomingPhraseHash !== challenge.phraseHash) {
    return { ok: false, reason: 'phrase_mismatch' }
  }

  const incomingSqlHash = hashSql(sql)
  if (incomingSqlHash !== challenge.sqlHash) {
    return { ok: false, reason: 'sql_hash_mismatch' }
  }

  challengeStore.delete(challenge.challengeId)
  return { ok: true, sqlHash: incomingSqlHash }
}

async function executeSql({
  sql,
  timeoutMs = SQL_TIMEOUT_MS,
  rowLimit = SQL_RESULT_ROW_LIMIT,
} = {}) {
  const normalizedSql = normalizeSql(sql)
  if (!normalizedSql) {
    return { error: 'SQL obrigatorio.' }
  }
  if (normalizedSql.length > SQL_MAX_LENGTH) {
    return { error: `SQL excede limite de ${SQL_MAX_LENGTH} caracteres.` }
  }

  const safeTimeoutMs = Math.max(500, Math.min(120_000, Number(timeoutMs) || SQL_TIMEOUT_MS))
  const safeRowLimit = Math.max(20, Math.min(2_000, Number(rowLimit) || SQL_RESULT_ROW_LIMIT))
  const client = await pool.connect()
  const notices = []
  const onNotice = (notice) => {
    notices.push({
      severity: String(notice?.severity || ''),
      message: String(notice?.message || ''),
      code: String(notice?.code || ''),
    })
  }
  client.on('notice', onNotice)

  const startedAt = process.hrtime.bigint()
  try {
    await client.query(`SET statement_timeout TO ${safeTimeoutMs}`)
    const result = await client.query(normalizedSql)
    const executionMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000

    const columns = Array.isArray(result?.fields) ? result.fields.map((field) => field.name) : []
    const allRows = Array.isArray(result?.rows) ? result.rows : []
    const truncated = allRows.length > safeRowLimit
    const rows = truncated ? allRows.slice(0, safeRowLimit) : allRows

    return {
      command: String(result?.command || ''),
      rowCount: Number(result?.rowCount || 0),
      executionMs: Number(executionMs.toFixed(2)),
      columns,
      rows,
      notices,
      truncated,
      sqlHash: hashSql(normalizedSql),
    }
  } finally {
    client.removeListener('notice', onNotice)
    client.release()
  }
}

module.exports = {
  normalizeSql,
  hashSql,
  requiresProductionChallenge,
  createSqlChallenge,
  verifySqlChallenge,
  executeSql,
}

