import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const startedAt = performance.now()
const command = process.platform === 'win32' ? 'cmd.exe' : 'npm'
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm run build']
  : ['run', 'build']

const result = spawnSync(command, args, {
  cwd: resolve(process.cwd()),
  stdio: 'inherit',
})
const elapsedMs = Number((performance.now() - startedAt).toFixed(2))

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const outputDir = resolve(process.cwd(), 'perf')
mkdirSync(outputDir, { recursive: true })
const outputPath = resolve(outputDir, 'frontend-build.json')
writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      buildMs: elapsedMs,
    },
    null,
    2,
  ),
)

console.log(`perf:build -> ${elapsedMs}ms`)
console.log(`perf:build report: ${outputPath}`)
