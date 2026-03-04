# Performance Pass Baseline (2026-03-04)

## Frontend (antes)
- Tempo de build local: ~9.6s
- Chunks principais observados:
  - `index-*.js`: ~330KB
  - `use-reduced-motion-*.js`: ~120KB
  - `Select-*.js`: ~50KB
- Situação de peso morto detectada:
  - `animejs` sem uso no `src`
  - `@supabase/supabase-js` sem uso no `src`
  - `tailwindcss` + `postcss` + configs ativos sem uso direto no CSS atual

## Backend (antes)
- `server.js` monolítico com queries embutidas.
- Sem `compression` HTTP.
- Header global `Cache-Control: no-store` para todas as rotas.
- Sem endpoint de métricas operacional.
- Sem cache de leitura pública no app.

## Infra/CI (antes)
- Pipeline sem etapa dedicada de benchmark/performance report.
- Sem artefato objetivo de “antes/depois”.
