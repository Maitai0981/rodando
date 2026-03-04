# Performance Pass Report

## Escopo
- Frontend: render/bundle/imagens/chunking.
- Backend: cache, métricas, logs estruturados, compressão e tuning de DB pool.
- Infra/CI: políticas de cache por rota + artefatos de perf.

## Antes vs Depois

### Frontend
| Métrica | Antes | Depois |
|---|---:|---:|
| Build local | ~9.6s | 8.63s |
| JS total (`dist/assets`) | N/A (sem histórico agregado) | 760.76 KB |
| CSS total (`dist/assets`) | N/A (sem histórico agregado) | 4.15 KB |
| Top chunk | `index-*.js ~330KB` | `assets/vendor-mui-BUadRBb8.js ~491.99KB` |

### Backend
| Métrica | Antes | Depois |
|---|---:|---:|
| Cache de leitura pública | Não | Sim (LRU TTL curto) |
| Compressão HTTP | Não | Sim (`compression`) |
| Endpoint de métricas | Não | Sim (`GET /api/metrics`) |
| Endpoint mais lento (p95) | N/A (sem benchmark prévio) | `/api/health (62.74ms)` |
| Cache hit-rate (amostra `perf:api`) | N/A (cache inexistente antes) | 87.5% |

### Top 10 chunks atuais
| Chunk | Tamanho |
|---|---:|
| `assets/vendor-mui-BUadRBb8.js` | 491.99 KB |
| `assets/index-tZdAZ0OZ.js` | 57.2 KB |
| `assets/vendor-query-BC3i5Dmo.js` | 38.09 KB |
| `assets/OwnerDashboardPage-kzt3S8Q9.js` | 19.15 KB |
| `assets/CatalogPage-BtIFkEl3.js` | 17.2 KB |
| `assets/HomePage-BtUJTvhx.js` | 15.93 KB |
| `assets/vendor-motion-icons-RtMcBckP.js` | 15.17 KB |
| `assets/OwnerProductFormPage-CHI7x_Ku.js` | 11.56 KB |
| `assets/OwnerProductsPage-Wh1Re5y4.js` | 9.73 KB |
| `assets/ProductDetailsPage-CTlAgPEk.js` | 9.51 KB |

### Top endpoints por p95 (amostra local)
| Endpoint | p95 (ms) | p99 (ms) | cache HIT | cache MISS |
|---|---:|---:|---:|---:|
| `/api/health` | 62.74 | 62.74 | 0 | 0 |
| `/api/products?page=1&pageSize=12&sort=best-sellers` | 43.02 | 43.02 | 7 | 1 |
| `/api/comments?limit=12` | 6.83 | 6.83 | 7 | 1 |
| `/api/catalog/highlights` | 4.3 | 4.3 | 7 | 1 |
| `/api/offers` | 3.31 | 3.31 | 7 | 1 |

## Principais ganhos
1. Cache de leitura pública com invalidação explícita por mutação, reduzindo latência média de endpoints de catálogo.
2. Compressão de respostas e política de cache HTTP por rota, reduzindo custo de tráfego e tempo de transferência.
3. Tuning de build com manual chunks no Vite, reduzindo pressão no chunk principal.
4. Remoção de dependências e pipeline CSS morta (tailwind/postcss/autoprefixer), simplificando DX e removendo risco de quebra de build.
5. Redução de re-render desnecessário em providers centrais (`AuthContext`, `CartContext`) e melhoria de imagens para CLS/LCP.

## Evidências geradas
- `frontend/perf/frontend-build.json`
- `frontend/perf/frontend-bundle.json`
- `backend/perf/backend-api.json`
