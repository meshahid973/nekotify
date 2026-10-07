import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const failures = []

const requiredFiles = [
  'src/app/App.tsx',
  'src/app/router.tsx',
  'src/components/layout/AppShell.tsx',
  'src/components/layout/PlayerBar.tsx',
  'src/features/playback/AudioEngine.ts',
  'src/features/playback/playback.store.ts',
  'src/features/queue/queue.store.ts',
  'src/styles/tokens.css',
  'src/stores/ui.store.ts',
  'docs/ARCHITECTURE.md',
  'docs/PERFORMANCE.md',
]

const forbiddenFiles = [
  'src/App.tsx',
  'src/App.css',
  'src/index.css',
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
    failures.push(`starter artifact must be removed: ${file}`)
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
      continue
    }

    files.push(path)
  }

  return files
}

const sourceFiles = walk(join(root, 'src')).filter((file) =>
  ['.ts', '.tsx'].includes(extname(file)),
)

for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8')
  const path = relative(root, file).replaceAll('\\', '/')

  if (source.includes('new Audio(') && path !== 'src/features/playback/AudioEngine.ts') {
    failures.push(`audio element ownership escaped AudioEngine: ${path}`)
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const allDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}

for (const dependency of [
  'electron',
  'framer-motion',
  '@mui/material',
  'antd',
  'bootstrap',
]) {
  if (dependency in allDependencies) {
    failures.push(`heavy dependency is outside the Phase 1 contract: ${dependency}`)
  }
}

const capabilities = readFileSync(
  join(root, 'src-tauri/capabilities/default.json'),
  'utf8',
)

if (/allow-all|fs:allow-|shell:allow-/i.test(capabilities)) {
  failures.push('Tauri default capability became broader than the Phase 1 contract')
}

if (failures.length > 0) {
  console.error('[foundation] failed')
  failures.forEach((failure) => console.error(` - ${failure}`))
  process.exit(1)
}

console.log(
  '[foundation] architecture ownership, starter cleanup, dependency budget and Tauri capability boundaries are guarded',
)
