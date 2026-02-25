const { test, expect } = require('@playwright/test');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://neyicdngqsourghhnpnm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_EsD6vF0jBH7G7y5We25ZGQ_aGGWOiaX';
const RUN_LIVE = process.env.RUN_LIVE_SUPABASE === '1';

test.describe('Conectividade real com Supabase', () => {
  test.skip(!RUN_LIVE, 'Defina RUN_LIVE_SUPABASE=1 para executar testes live de conectividade.');

  test('API REST responde e tabela products está acessível', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const elapsedMs = Date.now() - start;

    expect(response.ok()).toBeTruthy();
    expect(elapsedMs).toBeLessThan(5000);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('endpoint de autenticação responde', async ({ request }) => {
    const response = await request.get(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toBeTruthy();
  });
});
