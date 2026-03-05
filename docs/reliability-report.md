# Reliability Report (Before/After)

Date: 2026-03-04

## Implemented
- Env hardening com `APP_ENV` e bloqueio de flags destrutivas em ambiente real.
- Endpoint `GET /api/ready` com checks de ambiente + DB + outbox.
- Checkout idempotente via `Idempotency-Key` (`idempotency_keys`).
- Dedupe de webhook Mercado Pago (`payment_webhook_events`).
- Outbox com retry exponencial e dead-letter lógico (`outbox_jobs`).
- Runtime padronizado para Node 20.x (`.nvmrc` + `engines`).

## Validation summary
- Frontend build executado com sucesso:
  - `npm --prefix frontend run build`
  - tempo de build: ~2.94s (Vite output local)
- Backend test suite bloqueada no ambiente atual por credencial inválida do PostgreSQL (`28P01`).
  - comando executado: `npm --prefix backend run test`
  - erro: `autenticação do tipo senha falhou para o usuário "postgres"`
  - ação para destravar: ajustar `TEST_DATABASE_URL`/`DATABASE_URL` com credencial válida.

## Key expected gains
1. Evita duplicação de pedidos sob retry/reenvio de checkout.
2. Evita reprocessamento de webhook duplicado.
3. Melhora diagnóstico operacional com readiness real e métricas de outbox.
4. Reduz risco de perda de dados por reset/seed em produção.
5. Aumenta previsibilidade de runtime ao alinhar Node local e CI.
