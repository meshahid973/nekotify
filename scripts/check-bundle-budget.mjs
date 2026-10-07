import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import process from 'node:process'

const assetsDirectory = join(process.cwd(), 'dist', 'assets')

if (!existsSync(assetsDirectory)) {
  console.error('[bundle-budget] dist/assets is missing; run npm run build first')
  process.exit(1)
}

const files = readdirSync(assetsDirectory).map((name) =>
  join(assetsDirectory, name),
)

const totals = {
  js: 0,
  css: 0,
}

for (const file of files) {
  const extension = extname(file)

  if (extension !== '.js' && extension !== '.css') {
    continue
  }

  const bytes = gzipSync(readFileSync(file)).byteLength
  totals[extension === '.js' ? 'js' : 'css'] += bytes
}

const budgets = {
  js: 120 * 1024,
  css: 20 * 1024,
}

const kb = (bytes) => (bytes / 1024).toFixed(1)

console.log(
  `[bundle-budget] JS ${kb(totals.js)} KiB gzip / ${kb(budgets.js)} KiB; CSS ${kb(totals.css)} KiB gzip / ${kb(budgets.css)} KiB`,
)

if (totals.js > budgets.js || totals.css > budgets.css) {
  console.error('[bundle-budget] Phase 1 bundle budget exceeded')
  process.exit(1)
}
