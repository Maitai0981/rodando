# Performance Pass Checklist

- [x] Cache LRU de leitura pública com TTL curto (backend).
- [x] Endpoint de métricas `/api/metrics` com p95/p99 por rota, cache hit/miss e métricas de query.
- [x] `compression` habilitado no backend para payloads text/json.
- [x] Política de cache por rota (leitura pública com cache-control, mutações autenticadas `no-store`).
- [x] Invalidação de cache após mutações de produtos/ofertas/comentários.
- [x] Logging estruturado JSON para requests e erros não tratados.
- [x] Pool/timeout de conexão e query no Postgres.
- [x] Scripts de performance (`frontend perf:build`, `frontend perf:bundle`, `backend perf:api`).
- [x] Limpeza de dependências/frontend build chain não utilizadas (tailwind/postcss/autoprefixer/animejs/supabase).
- [x] Tuning de build/chunking no Vite.
- [x] Otimização de render/contexto (`AuthContext`, `CartContext`) com memo/callbacks estáveis.
- [x] Otimização de imagens com componente `ResponsiveImage` e `sizes/lazy`.
- [x] Coleta básica de Web Vitals (LCP/CLS/INP) no frontend.
- [x] Atualizar relatório final “antes/depois” com números coletados localmente.
