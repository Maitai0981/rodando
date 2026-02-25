const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const mockScript = fs.readFileSync(
  path.resolve(__dirname, '../mocks/supabase-js-mock.js'),
  'utf-8',
);

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: mockScript,
    });
  });

  await page.goto('/');
});

test('usuário comum não vê gestão de produtos e não acessa cadastro', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Painel do Proprietário' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Área restrita do proprietário' }).click();
  await expect(page.locator('#view-admin')).toBeVisible();

  await expect(page.locator('#admin-management')).toBeHidden();
  await expect(page.locator('#owner-products-panel')).toBeHidden();
  await expect(page.locator('#codigo')).toBeDisabled();
  await expect(page.locator('#btn-submit-product')).toBeDisabled();
});
