# Reliability Baseline

Data: 2026-03-04 (revisado: 2026-03-27)

## Runtime

| Componente | Versão alvo |
|------------|-------------|
| Java (backend) | 21 |
| Node.js (frontend/scripts) | 20.x |
| PostgreSQL | 16 |

## SLOs iniciais

| Endpoint / Operação            | Métrica | Alvo   |
|--------------------------------|---------|--------|
| `GET /api/health`              | p95     | < 200ms |
| `GET /api/products`            | p95     | < 800ms |
| `GET /api/catalog/highlights`  | p95     | < 400ms |
| Erros HTTP 5xx em carga curta  | taxa    | < 1%    |
| Checkout sem duplicação        | —       | idempotente sob reenvio |

## Baseline funcional

Fluxos cobertos na baseline: autenticação, catálogo, carrinho, checkout, painel owner, recuperação de senha.

## Comandos de evidência

```bash
# Backend
cd backend && ./mvnw test

# Frontend — unitários
cd frontend && npm run test:unit

# Frontend — acessibilidade
cd frontend && npm run test:a11y

# Frontend — build de produção
cd frontend && npm run build

# E2E (requer backend e banco rodando)
cd frontend && npm run test:e2e
```
