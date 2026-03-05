# DB Scripts

Database maintenance scripts for the backend.

- `db-migrate.js`: applies PostgreSQL schema and bootstrap data.
- `seed-roles.js`: ensures base roles (`customer`, `owner`).
- `seed-owner.js`: creates/updates one owner account from args/env.
- `reset-non-user-data.js`: clears operational tables (defaults to no reseed; pass `--reseed-base` to repopulate catalog samples).
- `purge-test-comments.js`: removes only reviews/comments tied to known test/e2e users.
- `purge-demo-users.js`: removes known demo/e2e users.
- `clean-real-data.js`: full cleanup for real-data mode (preserves real users/roles, removes demo users, keeps operational tables empty).
- `migrate-sqlite-to-postgres.js`: imports legacy SQLite data.

## Safety defaults

- Runtime recomendado: Node `20.x`.
- Defina `APP_ENV` explicitamente (`local|test|e2e|staging|production`).
- Em `staging/production`, `DB_RESET`, `SEED_*` e `E2E_ALLOW_RESET` são bloqueados.
- Para qualquer limpeza destrutiva em ambiente real, é obrigatório `ALLOW_DESTRUCTIVE=1`.

## Reliability tables managed by schema

- `idempotency_keys`: deduplicação de checkout/mutações críticas.
- `payment_webhook_events`: dedupe + trilha de processamento de webhooks.
- `outbox_jobs`: fila interna de retries com dead-letter lógico.
