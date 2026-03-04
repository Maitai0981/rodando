/* eslint-disable no-console */
const fs = require('node:fs')
const path = require('node:path')

const API_BASE = String(process.env.API_BASE || 'http://127.0.0.1:4000').replace(/\/$/, '')
const RUNS_PER_ENDPOINT = Math.max(1, Number(process.env.PERF_RUNS_PER_ENDPOINT || 8))
const ENDPOINTS = [
  '/api/health',
  '/api/products?page=1&pageSize=12&sort=best-sellers',
  '/api/offers',
  '/api/comments?limit=12',
  '/api/catalog/highlights',
  '/api/catalog/recommendations?limit=4',
]

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Number(sorted[idx].toFixed(2))
}

async function timedRequest(url) {
  const startedAt = performance.now()
  const response = await fetch(url)
  await response.arrayBuffer()
  const elapsedMs = Number((performance.now() - startedAt).toFixed(2))
  return {
    status: response.status,
    elapsedMs,
    cache: String(response.headers.get('x-cache') || ''),
  }
}

async function run() {
  const results = []

  for (const endpoint of ENDPOINTS) {
    const samples = []
    for (let index = 0; index < RUNS_PER_ENDPOINT; index += 1) {
      const result = await timedRequest(`${API_BASE}${endpoint}`)
      samples.push(result)
    }

    const durations = samples.map((item) => item.elapsedMs)
    const statusCounts = samples.reduce((acc, item) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1
      return acc
    }, {})
    const cacheHits = samples.filter((item) => item.cache === 'HIT').length
    const cacheMisses = samples.filter((item) => item.cache === 'MISS').length

    results.push({
      endpoint,
      runs: samples.length,
      avgMs: Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2)),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      maxMs: Number(Math.max(...durations).toFixed(2)),
      statusCounts,
      cacheHits,
      cacheMisses,
    })
  }

  results.sort((a, b) => b.p95Ms - a.p95Ms)
  console.table(results.map((item) => ({
    endpoint: item.endpoint,
    avgMs: item.avgMs,
    p95Ms: item.p95Ms,
    p99Ms: item.p99Ms,
    maxMs: item.maxMs,
    cacheHits: item.cacheHits,
    cacheMisses: item.cacheMisses,
  })))

  const outputDir = path.resolve(process.cwd(), 'perf')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.resolve(outputDir, 'backend-api.json')
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        apiBase: API_BASE,
        runsPerEndpoint: RUNS_PER_ENDPOINT,
        results,
      },
      null,
      2,
    ),
  )

  console.log(`perf:api report: ${outputPath}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
