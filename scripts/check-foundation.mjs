import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

const root = process.cwd()
const failures = []

const requiredFiles = [
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/PlayerBar.tsx',
  'src/components/media/TrackHero.tsx',
  'src/features/library/library.store.ts',
  'src/features/library/TrackRow.tsx',
  'src/features/playback/AudioEngine.ts',
  'src/features/playback/playback.store.ts',
  'src/features/queue/queue.store.ts',
  'src-tauri/src/library.rs',
]

const forbiddenFiles = [
  'src/App.tsx',
  'src/App.css',
  'src/index.css',
  'src/components/layout/AppHeader.tsx',
  'src/components/layout/AppHeader.css',
  'src/assets/hero.png',
  'src/assets/react.svg',
  'src/assets/vite.svg',
]

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    failures.push('required file is missing: ' + file)
  }
}

for (const file of forbiddenFiles) {
  if (existsSync(join(root, file))) {
    failures.push('obsolete file should not exist: ' + file)
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
    failures.push('audio element ownership escaped AudioEngine: ' + path)
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
  '@mui/material',
  'antd',
  'bootstrap',
]) {
  if (dependency in dependencies) {
    failures.push('heavy dependency is outside the lightweight contract: ' + dependency)
  }
}

const capabilities = readFileSync(
  join(root, 'src-tauri/capabilities/default.json'),
  'utf8',
)

if (/allow-all|fs:allow-|shell:allow-/i.test(capabilities)) {
  failures.push('Tauri default capability is broader than required')
}

const tauriConfig = JSON.parse(
  readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'),
)

if (tauriConfig.identifier !== 'xyz.nekowatch.nekotify') {
  failures.push('Tauri bundle identifier is incorrect')
}

if (!tauriConfig.app?.security?.csp) {
  failures.push('production Tauri CSP must remain enabled')
}

if (!tauriConfig.app?.security?.assetProtocol?.enable) {
  failures.push('Tauri asset protocol must stay enabled for local media')
}

const rustEntry = readFileSync(join(root, 'src-tauri/src/lib.rs'), 'utf8')

for (const command of [
  'library::load_library',
  'library::import_music_folder',
  'library::import_art_folder',
  'library::import_art_file',
  'library::remove_music_folder',
  'library::remove_art_source',
]) {
  if (!rustEntry.includes(command)) {
    failures.push('native library command is not registered: ' + command)
  }
}

const heroSource = readFileSync(join(root, 'src/components/media/TrackHero.tsx'), 'utf8')
const heroStyle = readFileSync(join(root, 'src/components/media/TrackHero.css'), 'utf8')
const shellStyle = readFileSync(join(root, 'src/components/layout/AppShell.css'), 'utf8')
const homeSource = readFileSync(join(root, 'src/pages/Home/HomePage.tsx'), 'utf8')

if (!heroSource.includes('className="track-hero__image"') ||
    !heroStyle.includes('.track-hero__image') ||
    !homeSource.includes('<TrackHero')) {
  failures.push('wide Home artwork hero must remain mounted and styled')
}

if (!shellStyle.includes('100dvh') ||
    !shellStyle.includes('minmax(0,1fr)')) {
  failures.push('fullscreen shell must retain flexible viewport sizing')
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

  if (totals.js > 185 * 1024) {
    failures.push(
      'built JavaScript exceeds 185 KiB gzip: ' +
        (totals.js / 1024).toFixed(1) +
        ' KiB',
    )
  }

  if (totals.css > 30 * 1024) {
    failures.push(
      'built CSS exceeds 30 KiB gzip: ' +
        (totals.css / 1024).toFixed(1) +
        ' KiB',
    )
  }

  console.log(
    '[check] bundle: JS ' +
      (totals.js / 1024).toFixed(1) +
      ' KiB gzip, CSS ' +
      (totals.css / 1024).toFixed(1) +
      ' KiB gzip',
  )
}

if (failures.length > 0) {
  console.error('[check] failed')
  failures.forEach((failure) => console.error(' - ' + failure))
  process.exit(1)
}

console.log(
  '[check] library, artwork import, playback ownership and bundle contract are guarded',
)
