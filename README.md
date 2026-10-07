# Nekotify

Nekotify is a lightweight, local-first desktop music player built with React, TypeScript, Vite, and Tauri.

The interface uses a persistent left library panel, a compact bottom player, pure-black OLED surfaces, and an optional artwork ambience mode.

## Current features

- local music folder import
- recursive native library scanning
- title, artist, album, duration, and cover-art metadata
- embedded artwork cache
- songs, albums, and artists views
- local search
- persistent playback and queue
- OLED and Ambience themes
- comfortable and compact density
- reduced-motion support

## Stack

- React 19 + TypeScript
- Vite
- Tauri 2 + Rust
- React Router
- Zustand
- Lofty
- TanStack Virtual
- Lucide React

## Development

```powershell
npm install
npm run tauri dev
```

Run the complete local gate with:

```powershell
npm run verify
```

The one project-specific architecture/bundle guard is:

```powershell
npm run check
```

See `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, and `docs/DEVELOPMENT.md`.

## Principles

1. React does not own the audio element.
2. Route changes do not recreate playback.
3. Filesystem scanning and metadata work stay native.
4. UI state and domain state stay separate.
5. Visual richness comes from real artwork, not a heavy animation runtime.
6. Verification stays focused on important contracts.
