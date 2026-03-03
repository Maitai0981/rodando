import { expect, test } from '@playwright/test'
import { ensureOwnerSession, resetE2EData } from './helpers/session'

test.afterEach(async ({ request }) => {
  await resetE2EData(request)
})

test('auth flow: signup e signin com validacao real', async ({ page }) => {
  await ensureOwnerSession(page.request)

  const suffix = Date.now()
  const email = `auth_ui_${suffix}@rodando.local`

  await page.goto('/auth/signup')
  await page.getByTestId('signup-name-input').fill('Cliente UI')
  await page.getByTestId('signup-email-input').fill(email)
  await page.getByTestId('signup-password-input').fill('123456')
  await page.getByTestId('signup-cep-input').fill('01001-000')
  await expect(page.getByTestId('signup-address-city-input')).toHaveValue(/.+/)
  await expect(page.getByTestId('signup-address-state-input')).toHaveValue(/^[A-Z]{2}$/)
  await page.getByTestId('signup-submit-button').click()

  await expect(page).toHaveURL(/\/$/)

  await page.goto('/auth')
  await page.getByTestId('signin-email-input').fill(email)
  await page.getByTestId('signin-password-input').fill('senha-errada')
  await page.getByTestId('signin-submit-button').click()
  await expect(page.getByText(/credenciais invalidas/i)).toBeVisible()
})
