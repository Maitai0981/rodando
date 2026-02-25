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
  await page.getByRole('button', { name: 'Área restrita do proprietário' }).click();
  await page.locator('#auth-email').fill('owner@rodando.com.br');
  await page.locator('#auth-password').fill('12345678');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('#admin-management')).toBeVisible();
  await expect(page.locator('#admin-message')).toContainText('Login realizado com sucesso.');
});

test('valida campos obrigatórios e valores inválidos no cadastro', async ({ page }) => {
  await page.locator('#descricao').click();
  await page.locator('#codigo').fill('');
  await page.locator('#nome').fill('');
  await page.locator('#modelo').fill('');
  await page.locator('#preco').fill('20');
  await page.locator('#estoque').fill('5');
  await page.getByRole('button', { name: 'Cadastrar Produto' }).click();

  await expect(page.locator('#admin-message')).toContainText('Código, nome e modelo são obrigatórios.');

  await page.locator('#descricao').fill('forca nova validacao');
  await page.locator('#codigo').fill('VAL-001');
  await page.locator('#nome').fill('Produto inválido');
  await page.locator('#modelo').fill('Modelo X');
  await page.locator('#preco').fill('-1');
  await page.locator('#estoque').fill('-5');
  await page.getByRole('button', { name: 'Cadastrar Produto' }).click();

  await expect(page.locator('#admin-message')).toContainText('Preço e estoque não podem ser negativos.');
});
