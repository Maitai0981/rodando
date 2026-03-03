import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'

export const API_BASE = 'http://127.0.0.1:4100'
export const OWNER_CREDENTIALS = {
  name: 'Owner E2E',
  email: 'owner_e2e@rodando.local',
  password: '123456',
}
const E2E_RESET_TOKEN = String(process.env.E2E_RESET_TOKEN || 'rodando-e2e-reset-token')

const MAX_ATTEMPTS = 6
const RETRY_DELAY_MS = 600

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForBackendHealth(request: APIRequestContext) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const health = await request.get(`${API_BASE}/api/health`)
      if (health.ok()) return
    } catch {
      // backend ainda subindo
    }
    await sleep(RETRY_DELAY_MS)
  }
}

export async function ensureOwnerSession(request: APIRequestContext) {
  await waitForBackendHealth(request)

  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const signin = await request.post(`${API_BASE}/api/auth/owner/signin`, {
        data: {
          email: OWNER_CREDENTIALS.email,
          password: OWNER_CREDENTIALS.password,
        },
      })
      expect(signin.ok()).toBeTruthy()
      const body = await signin.json()
      expect(body?.user?.role).toBe('owner')
      return
    } catch (error) {
      lastError = error
      await sleep(RETRY_DELAY_MS)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Nao foi possivel autenticar owner apos retries')
}

export async function resetE2EData(request: APIRequestContext) {
  await waitForBackendHealth(request)
  const reset = await request.post(`${API_BASE}/api/test/reset-non-user`, {
    headers: {
      'x-e2e-reset-token': E2E_RESET_TOKEN,
    },
  })
  expect(reset.ok()).toBeTruthy()
}
