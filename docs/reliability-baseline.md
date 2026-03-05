# Reliability Baseline

Date: 2026-03-04

## Runtime baseline
- Backend Node target: 20.x
- Frontend Node target: 20.x
- Local environment observed before hardening: Node 25.x (divergent from CI)

## Reliability targets (SLO inicial)
- `GET /api/health` p95 < 200ms
- `GET /api/products` p95 < 800ms
- HTTP 5xx < 1% em carga curta
- Checkout sem duplicação sob reenvio de request

## Functional baseline
- Core flows esperados: auth, catalogo, mochila, checkout, owner
- Hardening aplicado sem alterar contratos públicos de API

## Evidence commands
- `npm --prefix backend run test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:unit`
- `npm --prefix frontend run test:e2e`
