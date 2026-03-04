function serializeError(error) {
  if (!error) return null
  return {
    name: String(error.name || 'Error'),
    message: String(error.message || ''),
    code: String(error.code || ''),
    stack: String(error.stack || '')
      .split('\n')
      .slice(0, 6)
      .join('\n'),
  }
}

function log(level, event, payload = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  }
  const line = JSON.stringify(record)
  if (level === 'error') {
    console.error(line)
    return
  }
  console.log(line)
}

function info(event, payload) {
  log('info', event, payload)
}

function warn(event, payload) {
  log('warn', event, payload)
}

function error(event, payload) {
  const normalized = payload && payload.error
    ? { ...payload, error: serializeError(payload.error) }
    : payload
  log('error', event, normalized)
}

module.exports = {
  info,
  warn,
  error,
}
