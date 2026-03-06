const crypto = require('node:crypto')
const {
  recordRequest,
  recordCacheHit,
  recordCacheMiss,
  recordCacheSet,
  recordCacheInvalidation,
} = require('./metrics')
const { publicReadCache, hashPayload } = require('./cache')
const logger = require('./logger')
const { record: recordRequestBufferEntry } = require('./request-buffer')

const PUBLIC_CACHE_TTL_MS = Number(process.env.PUBLIC_CACHE_TTL_MS || 45_000)
const PUBLIC_CACHE_CONTROL = String(process.env.PUBLIC_CACHE_CONTROL || 'public, max-age=45, stale-while-revalidate=60')
const MAX_SANITIZE_DEPTH = 6
const MAX_ARRAY_ITEMS = 40
const MAX_OBJECT_KEYS = 50
const MAX_STRING_LENGTH = 260
const SENSITIVE_KEY_PATTERN = /(pass|password|token|secret|cookie|authorization|auth|document|cpf|cnpj|card|cvv|pix|key)/i

function truncateString(value) {
  if (value.length <= MAX_STRING_LENGTH) return value
  return `${value.slice(0, MAX_STRING_LENGTH)}…`
}

function maskSensitiveValue(value) {
  if (value === null || value === undefined) return '[redacted]'
  if (typeof value === 'string') return '[redacted]'
  return '[redacted]'
}

function sanitizeValue(value, depth = 0, key = '') {
  if (depth > MAX_SANITIZE_DEPTH) return '[depth-truncated]'
  if (SENSITIVE_KEY_PATTERN.test(String(key || ''))) return maskSensitiveValue(value)

  if (value === null || value === undefined) return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return truncateString(value)
  if (typeof value === 'bigint') return Number(value)
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1))
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[truncated:${value.length - MAX_ARRAY_ITEMS}]`)
    }
    return items
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS)
    const result = {}
    for (const [entryKey, entryValue] of entries) {
      result[entryKey] = sanitizeValue(entryValue, depth + 1, entryKey)
    }
    const totalKeys = Object.keys(value).length
    if (totalKeys > MAX_OBJECT_KEYS) {
      result.__truncated = `${totalKeys - MAX_OBJECT_KEYS} keys truncated`
    }
    return result
  }

  return truncateString(String(value))
}

function hashIp(ip) {
  const clean = String(ip || '').trim()
  if (!clean) return ''
  return crypto.createHash('sha256').update(clean).digest('hex').slice(0, 16)
}

function attachRequestTelemetry(req, res, next) {
  const startedAt = process.hrtime.bigint()
  const requestId = req.headers['x-request-id']
    ? String(req.headers['x-request-id'])
    : crypto.randomUUID()

  req.requestId = requestId
  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const route = req.route?.path || req.path || req.originalUrl || 'unknown'
    const bytes = Number(res.getHeader('content-length') || 0)
    const userId = Number(req.auth?.user?.id || 0) || null
    const queryMasked = sanitizeValue(req.query || {})
    const bodyMasked = sanitizeValue(req.body || {})
    const ipHash = hashIp(req.ip)
    const path = req.path || req.originalUrl || route
    recordRequest({
      method: req.method,
      route,
      status: res.statusCode,
      durationMs,
      bytes,
    })
    recordRequestBufferEntry({
      ts: new Date().toISOString(),
      requestId,
      method: req.method,
      path,
      routeKey: route,
      status: Number(res.statusCode || 0),
      durationMs: Number(durationMs.toFixed(2)),
      bytes,
      userId,
      ipHash,
      userAgent: truncateString(String(req.headers['user-agent'] || '')),
      queryMasked,
      bodyMasked,
    })

    logger.info('http_request', {
      requestId,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      bytes,
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || ''),
    })
  })

  next()
}

function setPublicCacheHeaders(res, etag) {
  res.setHeader('Cache-Control', PUBLIC_CACHE_CONTROL)
  if (etag) res.setHeader('ETag', etag)
}

function cacheKeyFromRequest(req, prefix) {
  return `${prefix}:${req.originalUrl || req.url || ''}`
}

function tryServeCachedJson(req, res, key) {
  const entry = publicReadCache.get(key)
  if (!entry) {
    recordCacheMiss()
    return false
  }

  const ifNoneMatch = String(req.headers['if-none-match'] || '').trim()
  if (ifNoneMatch && ifNoneMatch === entry.etag) {
    recordCacheHit()
    setPublicCacheHeaders(res, entry.etag)
    res.setHeader('x-cache', 'HIT')
    res.status(304).send()
    return true
  }

  recordCacheHit()
  setPublicCacheHeaders(res, entry.etag)
  res.setHeader('x-cache', 'HIT')
  res.status(entry.status).json(entry.body)
  return true
}

function cacheJsonResponse(res, key, body, status = 200, ttlMs = PUBLIC_CACHE_TTL_MS) {
  const etag = hashPayload(body)
  publicReadCache.set(
    key,
    {
      status,
      body,
      etag,
    },
    ttlMs,
  )
  recordCacheSet()
  setPublicCacheHeaders(res, etag)
  res.setHeader('x-cache', 'MISS')
}

function invalidatePublicCache(prefixes) {
  const removed = publicReadCache.invalidateByPrefix(prefixes)
  recordCacheInvalidation(removed)
  return removed
}

module.exports = {
  attachRequestTelemetry,
  cacheKeyFromRequest,
  tryServeCachedJson,
  cacheJsonResponse,
  invalidatePublicCache,
  PUBLIC_CACHE_CONTROL,
}
