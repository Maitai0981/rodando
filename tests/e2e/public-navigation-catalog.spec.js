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

test('navegação pública e catálogo funcionam corretamente', async ({ page }) => {
  await expect(page.locator('#view-home')).toBeVisible();

  await page.getByRole('button', { name: 'Informações Técnicas' }).click();
  await expect(page.locator('#view-info')).toBeVisible();

  await page.getByRole('button', { name: 'Produtos' }).click();
  await expect(page.locator('#view-products')).toBeVisible();

  await expect(page.locator('#public-count')).toContainText('2 produtos');
  await expect(page.locator('#products-grid .product-card')).toHaveCount(2);

  await page.locator('#search-products').fill('17 Larga');
  await expect(page.locator('#products-grid .product-card')).toHaveCount(1);
  await expect(page.locator('#products-grid')).toContainText('Aro 17 Larga');
});
