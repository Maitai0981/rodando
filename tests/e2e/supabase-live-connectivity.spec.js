const { test, expect } = require('@playwright/test');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://neyicdngqsourghhnpnm.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_EsD6vF0jBH7G7y5We25ZGQ_aGGWOiaX';
const RUN_LIVE = process.env.RUN_LIVE_SUPABASE === '1';
const OWNER_EMAIL = process.env.SUPABASE_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.SUPABASE_OWNER_PASSWORD;

function authHeaders(token = SUPABASE_ANON_KEY) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function readResponse(response) {
  const status = response.status();
  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { status, text, json };
}

test.describe('Conectividade real com Supabase', () => {
  test.skip(!RUN_LIVE, 'Defina RUN_LIVE_SUPABASE=1 para executar testes live de conectividade.');

  test('catálogo público responde no REST com latência aceitável', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${SUPABASE_URL}/rest/v1/products?select=id,codigo,nome&limit=3`, {
      headers: authHeaders(),
    });
    const elapsedMs = Date.now() - start;

    const payload = await readResponse(response);
    expect(
      response.ok(),
      `REST products falhou: status=${payload.status} body=${payload.text}`,
    ).toBeTruthy();
    expect(elapsedMs).toBeLessThan(5000);
    expect(Array.isArray(payload.json)).toBeTruthy();
  });

  test('endpoint de autenticação responde', async ({ request }) => {
    const response = await request.get(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });

    const payload = await readResponse(response);
    expect(
      response.ok(),
      `Auth settings falhou: status=${payload.status} body=${payload.text}`,
    ).toBeTruthy();
    expect(payload.json).toBeTruthy();
  });

  test('usuário anônimo não consegue inserir em products', async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/products`, {
      headers: {
        ...authHeaders(),
        Prefer: 'return=representation',
      },
      data: {
        codigo: `ANON-${Date.now()}`,
        nome: 'Teste invalido anonimo',
        modelo: 'SEM-AUTENTICACAO',
        preco: 1,
        estoque: 1,
      },
    });

    const payload = await readResponse(response);
    expect(response.ok(), `Inserção anônima deveria falhar. body=${payload.text}`).toBeFalsy();
    expect([401, 403]).toContain(payload.status);
  });

  test('proprietário autenticado consegue CRUD completo via REST', async ({ request }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Defina SUPABASE_OWNER_EMAIL e SUPABASE_OWNER_PASSWORD para validar CRUD live.');

    const loginResponse = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
      },
    });

    const loginPayload = await readResponse(loginResponse);
    expect(
      loginResponse.ok(),
      `Login proprietário falhou: status=${loginPayload.status} body=${loginPayload.text}`,
    ).toBeTruthy();
    const accessToken = loginPayload.json?.access_token;
    expect(accessToken).toBeTruthy();

    const codigo = `LIVE-${Date.now()}`;
    let createdId = null;

    try {
      const createResponse = await request.post(`${SUPABASE_URL}/rest/v1/products`, {
        headers: {
          ...authHeaders(accessToken),
          Prefer: 'return=representation',
        },
        data: {
          codigo,
          nome: 'Teste Live CRUD',
          modelo: 'QA-ROAD',
          fabricante: 'Rodando QA',
          categoria: 'Teste',
          preco: 10.5,
          estoque: 2,
          descricao: 'Registro temporário para validação de integração.',
        },
      });

      const createPayload = await readResponse(createResponse);
      expect(
        createResponse.ok(),
        `Create falhou: status=${createPayload.status} body=${createPayload.text}`,
      ).toBeTruthy();

      createdId = createPayload.json?.[0]?.id;
      expect(createdId).toBeTruthy();

      const updateResponse = await request.patch(`${SUPABASE_URL}/rest/v1/products?id=eq.${createdId}`, {
        headers: {
          ...authHeaders(accessToken),
          Prefer: 'return=representation',
        },
        data: {
          estoque: 5,
          preco: 12.9,
        },
      });

      const updatePayload = await readResponse(updateResponse);
      expect(
        updateResponse.ok(),
        `Update falhou: status=${updatePayload.status} body=${updatePayload.text}`,
      ).toBeTruthy();
      expect(updatePayload.json?.[0]?.estoque).toBe(5);

      const readResponseAfterUpdate = await request.get(`${SUPABASE_URL}/rest/v1/products?id=eq.${createdId}&select=id,codigo,estoque`, {
        headers: authHeaders(accessToken),
      });
      const readPayload = await readResponse(readResponseAfterUpdate);
      expect(
        readResponseAfterUpdate.ok(),
        `Read falhou: status=${readPayload.status} body=${readPayload.text}`,
      ).toBeTruthy();
      expect(readPayload.json?.[0]?.codigo).toBe(codigo);
    } finally {
      if (createdId) {
        await request.delete(`${SUPABASE_URL}/rest/v1/products?id=eq.${createdId}`, {
          headers: authHeaders(accessToken),
        });
      }
    }
  });
});
