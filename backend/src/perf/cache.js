const crypto = require('node:crypto')
const { recordCacheEviction } = require('./metrics')

class LruCache {
  constructor({ maxEntries = 500, defaultTtlMs = 45_000 } = {}) {
    this.maxEntries = Math.max(50, Number(maxEntries) || 500)
    this.defaultTtlMs = Math.max(1_000, Number(defaultTtlMs) || 45_000)
    this.store = new Map()
  }

  _evictIfNeeded() {
    while (this.store.size > this.maxEntries) {
      const firstKey = this.store.keys().next().value
      if (firstKey === undefined) break
      this.store.delete(firstKey)
      recordCacheEviction(1)
    }
  }

  _isExpired(entry) {
    return !entry || Number(entry.expiresAt || 0) <= Date.now()
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (this._isExpired(entry)) {
      this.store.delete(key)
      return null
    }
    this.store.delete(key)
    this.store.set(key, entry)
    return entry
  }

  set(key, value, ttlMs) {
    const expiresAt = Date.now() + Math.max(1_000, Number(ttlMs) || this.defaultTtlMs)
    this.store.delete(key)
    this.store.set(key, { ...value, expiresAt })
    this._evictIfNeeded()
  }

  invalidateByPrefix(prefixes) {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes]
    if (list.length === 0) return 0
    let removed = 0
    for (const key of this.store.keys()) {
      if (list.some((prefix) => key.startsWith(prefix))) {
        this.store.delete(key)
        removed += 1
      }
    }
    return removed
  }

  clear() {
    const size = this.store.size
    this.store.clear()
    return size
  }
}

function hashPayload(payload) {
  const serialized = JSON.stringify(payload)
  const hash = crypto.createHash('sha1').update(serialized).digest('base64url')
  return `W/"${hash}"`
}

const publicReadCache = new LruCache({
  maxEntries: Number(process.env.PUBLIC_CACHE_MAX_ENTRIES || 500),
  defaultTtlMs: Number(process.env.PUBLIC_CACHE_TTL_MS || 45_000),
})

module.exports = {
  LruCache,
  hashPayload,
  publicReadCache,
}
