const REQUEST_WINDOW = Number(process.env.METRICS_REQUEST_WINDOW || 600)
const QUERY_WINDOW = Number(process.env.METRICS_QUERY_WINDOW || 1_000)

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Number(sorted[idx].toFixed(2))
}

const state = {
  startAtMs: Date.now(),
  requests: {
    total: 0,
    byStatus: {},
    byRoute: {},
  },
  cache: {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    evictions: 0,
  },
  queries: {
    total: 0,
    slow: 0,
    durationsMs: [],
  },
}

function ensureRouteBucket(routeKey) {
  if (!state.requests.byRoute[routeKey]) {
    state.requests.byRoute[routeKey] = {
      count: 0,
      errors: 0,
      durationsMs: [],
      status: {},
      bytes: 0,
    }
  }
  return state.requests.byRoute[routeKey]
}

function recordRequest({ method, route, status, durationMs, bytes }) {
  state.requests.total += 1
  state.requests.byStatus[status] = Number(state.requests.byStatus[status] || 0) + 1

  const routeKey = `${method.toUpperCase()} ${route || 'unknown'}`
  const bucket = ensureRouteBucket(routeKey)
  bucket.count += 1
  if (status >= 400) bucket.errors += 1
  bucket.status[status] = Number(bucket.status[status] || 0) + 1
  bucket.bytes += Number(bytes || 0)
  bucket.durationsMs.push(Number(durationMs.toFixed(2)))
  if (bucket.durationsMs.length > REQUEST_WINDOW) {
    bucket.durationsMs.splice(0, bucket.durationsMs.length - REQUEST_WINDOW)
  }
}

function recordCacheHit() {
  state.cache.hits += 1
}

function recordCacheMiss() {
  state.cache.misses += 1
}

function recordCacheSet() {
  state.cache.sets += 1
}

function recordCacheInvalidation(count = 1) {
  state.cache.invalidations += Math.max(0, Number(count) || 0)
}

function recordCacheEviction(count = 1) {
  state.cache.evictions += Math.max(0, Number(count) || 0)
}

function recordQuery(durationMs, { slowThresholdMs = 250 } = {}) {
  state.queries.total += 1
  if (durationMs >= slowThresholdMs) state.queries.slow += 1
  state.queries.durationsMs.push(Number(durationMs.toFixed(2)))
  if (state.queries.durationsMs.length > QUERY_WINDOW) {
    state.queries.durationsMs.splice(0, state.queries.durationsMs.length - QUERY_WINDOW)
  }
}

function snapshot() {
  const routes = Object.entries(state.requests.byRoute).map(([route, bucket]) => ({
    route,
    count: bucket.count,
    errors: bucket.errors,
    status: bucket.status,
    bytes: bucket.bytes,
    p95Ms: percentile(bucket.durationsMs, 95),
    p99Ms: percentile(bucket.durationsMs, 99),
    avgMs: bucket.durationsMs.length
      ? Number((bucket.durationsMs.reduce((sum, value) => sum + value, 0) / bucket.durationsMs.length).toFixed(2))
      : 0,
  }))

  routes.sort((a, b) => b.p95Ms - a.p95Ms || b.count - a.count)

  const queryDurations = state.queries.durationsMs
  return {
    startedAt: new Date(state.startAtMs).toISOString(),
    uptimeSec: Number(((Date.now() - state.startAtMs) / 1000).toFixed(2)),
    requests: {
      total: state.requests.total,
      byStatus: state.requests.byStatus,
      routes,
    },
    cache: {
      ...state.cache,
      hitRate: state.cache.hits + state.cache.misses > 0
        ? Number((state.cache.hits / (state.cache.hits + state.cache.misses)).toFixed(4))
        : 0,
    },
    queries: {
      total: state.queries.total,
      slow: state.queries.slow,
      p95Ms: percentile(queryDurations, 95),
      p99Ms: percentile(queryDurations, 99),
      avgMs: queryDurations.length
        ? Number((queryDurations.reduce((sum, value) => sum + value, 0) / queryDurations.length).toFixed(2))
        : 0,
    },
  }
}

module.exports = {
  recordRequest,
  recordCacheHit,
  recordCacheMiss,
  recordCacheSet,
  recordCacheInvalidation,
  recordCacheEviction,
  recordQuery,
  snapshot,
}
