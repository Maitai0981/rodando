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

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Área restrita do proprietário' }).click();
});

test('proprietário autenticado realiza CRUD completo', async ({ page }) => {
  await page.locator('#auth-email').fill('owner@rodando.com.br');
  await page.locator('#auth-password').fill('12345678');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.locator('#auth-user')).toContainText('owner@rodando.com.br');
  await expect(page.locator('#admin-management')).toBeVisible();
  await expect(page.locator('#owner-products-panel')).toBeVisible();

  await page.locator('#codigo').fill('TEST-001');
  await page.locator('#nome').fill('Kit de Corrente Premium');
  await page.locator('#modelo').fill('CG 160');
  await page.locator('#fabricante').fill('Rodando Labs');
  await page.locator('#categoria').fill('Transmissão');
  await page.locator('#preco').fill('199.90');
  await page.locator('#estoque').fill('12');
  await page.locator('#descricao').fill('Peça de teste automatizado.');
  await page.getByRole('button', { name: 'Cadastrar Produto' }).click();

  await expect(page.locator('#admin-message')).toContainText('Produto cadastrado com sucesso.');
  await expect(page.locator('#owner-table-body')).toContainText('TEST-001');

  const row = page.locator('#owner-table-body tr', { hasText: 'TEST-001' }).first();
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.locator('#estoque').fill('8');
  await page.getByRole('button', { name: 'Atualizar Produto' }).click();

  await expect(page.locator('#admin-message')).toContainText('Produto atualizado com sucesso.');
  await expect(page.locator('#owner-table-body')).toContainText('8');

  const updated = page.locator('#owner-table-body tr', { hasText: 'TEST-001' }).first();
  await updated.getByRole('button', { name: 'Excluir' }).click();

  await expect(page.locator('#admin-message')).toContainText('Produto excluído com sucesso.');
  await expect(page.locator('#owner-table-body')).not.toContainText('TEST-001');

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.locator('#admin-management')).toBeHidden();
  await expect(page.locator('#owner-products-panel')).toBeHidden();
});
