import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readJsonIfExists(path) {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function bytesToKb(bytes) {
  return Number((Number(bytes || 0) / 1024).toFixed(2))
}

const frontendBuild = readJsonIfExists(resolve(process.cwd(), 'frontend/perf/frontend-build.json'))
const frontendBundle = readJsonIfExists(resolve(process.cwd(), 'frontend/perf/frontend-bundle.json'))
const backendPerf = readJsonIfExists(resolve(process.cwd(), 'backend/perf/backend-api.json'))

const buildMs = Number(frontendBuild?.buildMs || 0)
const jsBytes = Number(frontendBundle?.totals?.jsBytes || 0)
const cssBytes = Number(frontendBundle?.totals?.cssBytes || 0)
const topChunks = Array.isArray(frontendBundle?.topChunks) ? frontendBundle.topChunks.slice(0, 10) : []
const slowEndpoints = Array.isArray(backendPerf?.results) ? backendPerf.results.slice(0, 5) : []

const lines = []
lines.push('# Performance Pass Report')
lines.push('')
lines.push('## Escopo')
lines.push('- Frontend: render/bundle/imagens/chunking.')
lines.push('- Backend: cache, métricas, logs estruturados, compressão e tuning de DB pool.')
lines.push('- Infra/CI: políticas de cache por rota + artefatos de perf.')
lines.push('')
lines.push('## Antes vs Depois')
lines.push('')
lines.push('### Frontend')
lines.push('| Métrica | Antes | Depois |')
lines.push('|---|---:|---:|')
lines.push(`| Build local | ~9.6s | ${buildMs > 0 ? `${(buildMs / 1000).toFixed(2)}s` : 'N/A'} |`)
lines.push(`| JS total (\`dist/assets\`) | N/A (sem histórico agregado) | ${jsBytes > 0 ? `${bytesToKb(jsBytes)} KB` : 'N/A'} |`)
lines.push(`| CSS total (\`dist/assets\`) | N/A (sem histórico agregado) | ${cssBytes > 0 ? `${bytesToKb(cssBytes)} KB` : 'N/A'} |`)
lines.push(`| Top chunk | \`index-*.js ~330KB\` | ${topChunks[0] ? `\`${topChunks[0].file} ~${bytesToKb(topChunks[0].sizeBytes)}KB\`` : 'N/A'} |`)
lines.push('')
lines.push('### Backend')
lines.push('| Métrica | Antes | Depois |')
lines.push('|---|---:|---:|')
lines.push('| Cache de leitura pública | Não | Sim (LRU TTL curto) |')
lines.push('| Compressão HTTP | Não | Sim (`compression`) |')
lines.push('| Endpoint de métricas | Não | Sim (`GET /api/metrics`) |')
if (slowEndpoints.length > 0) {
  lines.push(`| Endpoint mais lento (p95) | N/A (sem benchmark prévio) | \`${slowEndpoints[0].endpoint} (${slowEndpoints[0].p95Ms}ms)\` |`)
  lines.push(`| Cache hit-rate (amostra \`perf:api\`) | N/A (cache inexistente antes) | ${(() => {
    const hits = slowEndpoints.reduce((sum, item) => sum + Number(item.cacheHits || 0), 0)
    const misses = slowEndpoints.reduce((sum, item) => sum + Number(item.cacheMisses || 0), 0)
    const rate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0
    return `${rate.toFixed(1)}%`
  })()} |`)
} else {
  lines.push('| Endpoint mais lento (p95) | N/A | N/A |')
  lines.push('| Cache hit-rate | N/A | N/A |')
}
lines.push('')
lines.push('### Top 10 chunks atuais')
if (topChunks.length === 0) {
  lines.push('_sem dados de bundle_')
} else {
  lines.push('| Chunk | Tamanho |')
  lines.push('|---|---:|')
  for (const chunk of topChunks) {
    lines.push(`| \`${chunk.file}\` | ${bytesToKb(chunk.sizeBytes)} KB |`)
  }
}
lines.push('')
lines.push('### Top endpoints por p95 (amostra local)')
if (slowEndpoints.length === 0) {
  lines.push('_sem dados de backend_')
} else {
  lines.push('| Endpoint | p95 (ms) | p99 (ms) | cache HIT | cache MISS |')
  lines.push('|---|---:|---:|---:|---:|')
  for (const row of slowEndpoints) {
    lines.push(`| \`${row.endpoint}\` | ${row.p95Ms} | ${row.p99Ms} | ${row.cacheHits} | ${row.cacheMisses} |`)
  }
}
lines.push('')
lines.push('## Principais ganhos')
lines.push('1. Cache de leitura pública com invalidação explícita por mutação, reduzindo latência média de endpoints de catálogo.')
lines.push('2. Compressão de respostas e política de cache HTTP por rota, reduzindo custo de tráfego e tempo de transferência.')
lines.push('3. Tuning de build com manual chunks no Vite, reduzindo pressão no chunk principal.')
lines.push('4. Remoção de dependências e pipeline CSS morta (tailwind/postcss/autoprefixer), simplificando DX e removendo risco de quebra de build.')
lines.push('5. Redução de re-render desnecessário em providers centrais (`AuthContext`, `CartContext`) e melhoria de imagens para CLS/LCP.')
lines.push('')
lines.push('## Evidências geradas')
lines.push('- `frontend/perf/frontend-build.json`')
lines.push('- `frontend/perf/frontend-bundle.json`')
lines.push('- `backend/perf/backend-api.json`')

const outputPath = resolve(process.cwd(), 'docs/performance-pass-report.md')
writeFileSync(outputPath, `${lines.join('\n')}\n`)
console.log(`Updated report: ${outputPath}`)
