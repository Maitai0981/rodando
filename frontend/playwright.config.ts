import { defineConfig } from '@playwright/test'

const FALLBACK_E2E_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5432/rodando_e2e'
const e2eDatabaseUrl =
  String(process.env.E2E_DATABASE_URL || '').trim() ||
  String(process.env.DATABASE_URL || '').trim() ||
  FALLBACK_E2E_DATABASE_URL
const backendPort = String(process.env.E2E_BACKEND_PORT || process.env.PORT || '4100')
const frontendPort = String(process.env.E2E_FRONTEND_PORT || '4175')

const ownerSeedEmail = String(process.env.OWNER_SEED_EMAIL || 'owner_e2e@rodando.local')
const ownerSeedPassword = String(process.env.OWNER_SEED_PASSWORD || '123456')
const ownerSeedName = String(process.env.OWNER_SEED_NAME || 'Owner E2E')
const e2eResetToken = String(process.env.E2E_RESET_TOKEN || 'rodando-e2e-reset-token')

function describeDatabaseTarget(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl)
    const dbName = parsed.pathname.replace(/^\//, '') || '(default)'
    const port = parsed.port || '5432'
    return `${parsed.hostname}:${port}/${dbName} (user=${parsed.username || 'n/a'})`
  } catch {
    return 'invalid DATABASE_URL'
  }
}

console.log(`[playwright] Backend E2E DB target: ${describeDatabaseTarget(e2eDatabaseUrl)}`)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 12_000,
  },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: `http://127.0.0.1:${backendPort}/api/health`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: backendPort,
        DATABASE_URL: e2eDatabaseUrl,
        SEED_BASE_CATALOG: String(process.env.SEED_BASE_CATALOG || '1'),
        DB_RESET: String(process.env.DB_RESET || '1'),
        SEED_DEMO_DATA: String(process.env.SEED_DEMO_DATA || '0'),
        OWNER_SEED_EMAIL: ownerSeedEmail,
        OWNER_SEED_PASSWORD: ownerSeedPassword,
        OWNER_SEED_NAME: ownerSeedName,
        E2E_ALLOW_RESET: '1',
        E2E_RESET_TOKEN: e2eResetToken,
      },
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      cwd: '.',
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_PROXY_TARGET: `http://127.0.0.1:${backendPort}`,
        VITE_ASSIST_ENABLED: String(process.env.VITE_ASSIST_ENABLED || '1'),
        VITE_ASSIST_ROLLOUT_PERCENT: String(process.env.VITE_ASSIST_ROLLOUT_PERCENT || '25'),
      },
      timeout: 120_000,
    },
  ],
})
