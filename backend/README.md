# Backend Structure

This backend is organized by responsibility to keep data, scripts, and runtime code separated.

## Folders

- `src/`: API source code (`server.js`, auth, and DB module in `src/db/`).
- `src/db/`: PostgreSQL access layer, schema, and SQL migrations.
- `scripts/db/`: database utility scripts (`db:migrate`, seeds, and legacy migration tool).
- `test/`: backend automated tests (integration, domain, and non-functional checks).
- `data/`: local SQLite artifacts used by legacy and some test flows.
- `legacy/`: archived files kept for migration history (`sqlite/` and `trash/`).

## Script Usage

- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:seed:owner -- <email> <senha> [nome]`
- `npm run db:reset:non-user` (sem reseed de catalogo por padrao)
- `npm run db:reset:non-user -- --reseed-base` (somente para ambiente de teste/demonstracao)
- `npm run db:purge:test-comments` (remove reviews de usuarios de teste/e2e sem tocar em dados reais)
- `npm run db:purge:demo-users`
- `npm run db:clean:real`
- `npm run db:migrate:legacy -- <sqlite-file-path>`
- `npm run perf:api` (benchmark curto de endpoints públicos e geração de `backend/perf/backend-api.json`)

## Performance/Observability

- Compressão HTTP ativa (`compression`) para respostas text/json.
- Cache público em memória (LRU com TTL curto) para endpoints de leitura:
  - `/api/products*`
  - `/api/offers*`
  - `/api/comments*`
  - `/api/catalog/*`
- Invalidação de cache ocorre após mutações de produtos/ofertas/comentários.
- Métricas em `GET /api/metrics` (requests, latência p95/p99 por rota, cache hit/miss, métricas de query).
- Healthcheck em `GET /api/health` com status de DB/pool.

## Notes

- Runtime DB is PostgreSQL (`DATABASE_URL`).
- Para ambiente real, use:
  - `SEED_BASE_CATALOG=0`
  - `SEED_DEMO_DATA=0`
- Public API code should remain under `src/`.
- Historical/temporary files should go under `legacy/`, not `src/`.

## Runbook: limpar para dados reais

1. (Opcional) gerar backup:
   - `pg_dump --dbname "$env:DATABASE_URL" --file backup-before-clean.sql`
2. Garantir seeds desativados no ambiente:
   - `SEED_BASE_CATALOG=0`
   - `SEED_DEMO_DATA=0`
3. Rodar limpeza:
   - `npm run db:clean:real`
4. Reiniciar backend e validar contagens (produtos/ofertas/reviews = 0, usuarios preservados).
