import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(full))
      continue
    }
    if (!entry.isFile()) continue
    files.push(full)
  }
  return files
}

const distDir = resolve(process.cwd(), 'dist')
const assetDir = resolve(distDir, 'assets')
const files = collectFiles(assetDir).map((file) => {
  const stats = statSync(file)
  return {
    file: file.replace(`${distDir}\\`, '').replace(`${distDir}/`, '').replaceAll('\\', '/'),
    sizeBytes: Number(stats.size || 0),
    ext: extname(file).toLowerCase(),
  }
})

const jsFiles = files.filter((item) => item.ext === '.js')
const cssFiles = files.filter((item) => item.ext === '.css')

const sortBySizeDesc = (a, b) => b.sizeBytes - a.sizeBytes
const topChunks = [...files].sort(sortBySizeDesc).slice(0, 10)

const output = {
  generatedAt: new Date().toISOString(),
  totals: {
    jsBytes: jsFiles.reduce((sum, item) => sum + item.sizeBytes, 0),
    cssBytes: cssFiles.reduce((sum, item) => sum + item.sizeBytes, 0),
    assetBytes: files.reduce((sum, item) => sum + item.sizeBytes, 0),
    fileCount: files.length,
  },
  topChunks,
}

const outputDir = resolve(process.cwd(), 'perf')
mkdirSync(outputDir, { recursive: true })
const outputPath = resolve(outputDir, 'frontend-bundle.json')
writeFileSync(outputPath, JSON.stringify(output, null, 2))

console.log('perf:bundle summary')
console.table(
  topChunks.map((item) => ({
    file: item.file,
    kb: Number((item.sizeBytes / 1024).toFixed(2)),
  })),
)
console.log(`perf:bundle report: ${outputPath}`)
