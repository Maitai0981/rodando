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

test('home apresenta posicionamento comercial claro', async ({ page }) => {
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#view-home')).toContainText('Peças certas');
  await expect(page.getByRole('button', { name: 'Ver Catálogo' })).toBeVisible();
  await expect(page.locator('.trust-strip')).toBeVisible();
});

test('informações técnicas exibem referências de aplicação', async ({ page }) => {
  await page.getByRole('button', { name: 'Informações Técnicas' }).click();

  await expect(page.locator('#view-info')).toBeVisible();
  await expect(page.locator('#view-info')).toContainText('Aro 18 Fina');
  await expect(page.locator('#view-info')).toContainText('Aro 17 Larga');
  await expect(page.locator('#view-info')).toContainText('Montagem segura');
});

test('visitante visualiza aviso de restrição e não vê cadastro', async ({ page }) => {
  await page.getByRole('button', { name: 'Área restrita do proprietário' }).click();

  await expect(page.locator('#view-admin')).toBeVisible();
  await expect(page.locator('#visitor-warning')).toContainText('visitante');
  await expect(page.locator('#admin-management')).toBeHidden();
  await expect(page.locator('#owner-products-panel')).toBeHidden();
  await expect(page.locator('#btn-submit-product')).toBeDisabled();
});
