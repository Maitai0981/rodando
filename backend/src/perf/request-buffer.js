const DEFAULT_CAPACITY = Math.max(100, Number(process.env.REQUEST_BUFFER_CAPACITY || 5000))
const MAX_LIMIT = 500

const state = {
  capacity: DEFAULT_CAPACITY,
  entries: new Array(DEFAULT_CAPACITY),
  cursor: 0,
  count: 0,
  sequence: 0,
}

function normalizeFilters(filters = {}) {
  const parsedLimit = Number(filters.limit)
  const parsedOffset = Number(filters.offset)
  const parsedStatusMin = Number(filters.statusMin)
  const parsedStatusMax = Number(filters.statusMax)

  return {
    limit: Number.isInteger(parsedLimit) ? Math.max(1, Math.min(MAX_LIMIT, parsedLimit)) : 100,
    offset: Number.isInteger(parsedOffset) ? Math.max(0, parsedOffset) : 0,
    method: String(filters.method || '').trim().toUpperCase(),
    route: String(filters.route || '').trim().toLowerCase(),
    q: String(filters.q || '').trim().toLowerCase(),
    statusMin: Number.isFinite(parsedStatusMin) ? Math.max(100, Math.min(599, parsedStatusMin)) : null,
    statusMax: Number.isFinite(parsedStatusMax) ? Math.max(100, Math.min(599, parsedStatusMax)) : null,
    from: parseDateToMs(filters.from),
    to: parseDateToMs(filters.to),
  }
}

function parseDateToMs(value) {
  if (!value) return null
  const parsed = new Date(String(value))
  const time = parsed.getTime()
  return Number.isFinite(time) ? time : null
}

function record(entry) {
  const safeEntry = {
    id: ++state.sequence,
    ...entry,
  }
  state.entries[state.cursor] = safeEntry
  state.cursor = (state.cursor + 1) % state.capacity
  state.count = Math.min(state.count + 1, state.capacity)
  return safeEntry
}

function listNewestFirst() {
  const items = []
  for (let index = 0; index < state.count; index += 1) {
    const slot = (state.cursor - 1 - index + state.capacity) % state.capacity
    const value = state.entries[slot]
    if (value) items.push(value)
  }
  return items
}

function matchesFilter(entry, filter) {
  if (filter.method && String(entry.method || '').toUpperCase() !== filter.method) {
    return false
  }
  if (filter.route) {
    const path = String(entry.path || '').toLowerCase()
    const routeKey = String(entry.routeKey || '').toLowerCase()
    if (!path.includes(filter.route) && !routeKey.includes(filter.route)) return false
  }
  if (filter.statusMin !== null && Number(entry.status || 0) < filter.statusMin) {
    return false
  }
  if (filter.statusMax !== null && Number(entry.status || 0) > filter.statusMax) {
    return false
  }
  const entryMs = parseDateToMs(entry.ts)
  if (filter.from !== null && entryMs !== null && entryMs < filter.from) return false
  if (filter.to !== null && entryMs !== null && entryMs > filter.to) return false

  if (filter.q) {
    const haystack = [
      String(entry.requestId || ''),
      String(entry.path || ''),
      String(entry.routeKey || ''),
      String(entry.userId || ''),
      String(entry.userAgent || ''),
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(filter.q)) return false
  }
  return true
}

function query(filters = {}) {
  const normalized = normalizeFilters(filters)
  const all = listNewestFirst().filter((entry) => matchesFilter(entry, normalized))
  const total = all.length
  const start = normalized.offset
  const end = start + normalized.limit
  const items = all.slice(start, end)

  return {
    items,
    meta: {
      total,
      limit: normalized.limit,
      offset: normalized.offset,
      bufferSize: state.count,
    },
  }
}

function size() {
  return state.count
}

module.exports = {
  record,
  query,
  size,
}

