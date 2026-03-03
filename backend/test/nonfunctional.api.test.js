const assert = require('node:assert/strict')
const { performance } = require('node:perf_hooks')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

test('nonfunctional: latencia e carga curta em endpoints criticos', async () => {
  const { app } = createTestContext(true)
  const agent = request.agent(app)
  await agent.get('/api/health')

  const endpoints = [
    '/api/health',
    '/api/products?page=1&pageSize=10&sort=best-sellers',
    '/api/offers',
    '/api/comments?limit=8',
    '/api/catalog/highlights',
    '/api/catalog/recommendations?limit=4',
  ]

  for (const endpoint of endpoints) {
    const start = performance.now()
    const res = await agent.get(endpoint)
    const elapsed = performance.now() - start
    assert.equal(res.status, 200)
    assert.ok(elapsed < 1500, `Endpoint ${endpoint} acima do budget: ${elapsed.toFixed(2)}ms`)
  }

  const concurrent = await Promise.all(
    Array.from({ length: 16 }).map(async () => {
      const start = performance.now()
      const res = await request(app).get('/api/products?page=1&pageSize=10')
      assert.equal(res.status, 200)
      return performance.now() - start
    }),
  )

  const max = Math.max(...concurrent)
  const avg = concurrent.reduce((sum, value) => sum + value, 0) / concurrent.length
  assert.ok(max < 1800, `Pico de latencia elevado: ${max.toFixed(2)}ms`)
  assert.ok(avg < 800, `Media de latencia elevada: ${avg.toFixed(2)}ms`)
})
