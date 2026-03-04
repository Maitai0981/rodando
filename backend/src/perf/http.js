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

const PUBLIC_CACHE_TTL_MS = Number(process.env.PUBLIC_CACHE_TTL_MS || 45_000)
const PUBLIC_CACHE_CONTROL = String(process.env.PUBLIC_CACHE_CONTROL || 'public, max-age=45, stale-while-revalidate=60')

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
    recordRequest({
      method: req.method,
      route,
      status: res.statusCode,
      durationMs,
      bytes,
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
