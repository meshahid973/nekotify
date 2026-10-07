import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

const root = process.cwd()
const failures = []

const requiredFiles = [
  'src/app/App.tsx',
  'src/app/router.tsx',
  'src/components/layout/AppHeader.tsx',
  'src/components/layout/AppShell.tsx',
  'src/components/layout/PlayerBar.tsx',
  'src/features/playback/AudioEngine.ts',
  'src/features/playback/playback.store.ts',
  'src/features/queue/queue.store.ts',
  'src/styles/tokens.css',
  'src/stores/ui.store.ts',
]

const forbiddenFiles = [
  'src/App.tsx',
  'src/App.css',
  'src/index.css',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Sidebar.css',
  'src/components/primitives/Surface.tsx',
  'src/components/primitives/Surface.css',
  'src/assets/hero.png',
  'src/assets/react.svg',
  'src/assets/vite.svg',
  'public/icons.svg',
]

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    failures.push(`required foundation file is missing: ${file}`)
  }
}

for (const file of forbiddenFiles) {
  if (existsSync(join(root, file))) {
    failures.push(`obsolete starter/foundation file should not exist: ${file}`)
  }
}

function walk(directory) {
  if (!existsSync(directory)) {
    return []
  }

  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...walk(path))
    } else {
      files.push(path)
    }
  }

  return files
}

for (const file of walk(join(root, 'src')).filter((path) =>
  ['.ts', '.tsx'].includes(extname(path)),
)) {
  const source = readFileSync(file, 'utf8')
  const path = relative(root, file).replaceAll('\\', '/')

  if (
    source.includes('new Audio(') &&
    path !== 'src/features/playback/AudioEngine.ts'
  ) {
    failures.push(`audio element ownership escaped AudioEngine: ${path}`)
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}

for (const dependency of [
  'electron',
  'framer-motion',
  'motion',
  '@mui/material',
  'antd',
  'bootstrap',
]) {
  if (dependency in dependencies) {
    failures.push(`heavy dependency is outside the Phase 1 contract: ${dependency}`)
  }
}

const capabilities = readFileSync(
  join(root, 'src-tauri/capabilities/default.json'),
  'utf8',
)

if (/allow-all|fs:allow-|shell:allow-/i.test(capabilities)) {
  failures.push('Tauri default capability became broader than Phase 1 requires')
}

const tauriConfig = JSON.parse(
  readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'),
)

if (tauriConfig.identifier !== 'xyz.nekowatch.nekotify') {
  failures.push('Tauri bundle identifier drifted from xyz.nekowatch.nekotify')
}

if (!tauriConfig.app?.security?.csp) {
  failures.push('production Tauri CSP must remain enabled')
}

const assetsDirectory = join(root, 'dist', 'assets')

if (existsSync(assetsDirectory)) {
  const totals = { js: 0, css: 0 }

  for (const name of readdirSync(assetsDirectory)) {
    const file = join(assetsDirectory, name)
    const extension = extname(file)

    if (extension === '.js') {
      totals.js += gzipSync(readFileSync(file)).byteLength
    } else if (extension === '.css') {
      totals.css += gzipSync(readFileSync(file)).byteLength
    }
  }

  if (totals.js > 120 * 1024) {
    failures.push(
      `built JavaScript exceeds 120 KiB gzip: ${(totals.js / 1024).toFixed(1)} KiB`,
    )
  }

  if (totals.css > 24 * 1024) {
    failures.push(
      `built CSS exceeds 24 KiB gzip: ${(totals.css / 1024).toFixed(1)} KiB`,
    )
  }

  console.log(
    `[foundation] bundle: JS ${(totals.js / 1024).toFixed(1)} KiB gzip, CSS ${(totals.css / 1024).toFixed(1)} KiB gzip`,
  )
}

if (failures.length > 0) {
  console.error('[foundation] failed')
  failures.forEach((failure) => console.error(` - ${failure}`))
  process.exit(1)
}

console.log(
  '[foundation] architecture, playback ownership, capability scope and lightweight bundle contract are guarded',
)
