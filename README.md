# Nekotify

Nekotify is a lightweight, local-first desktop music player built with React, TypeScript, Vite, and Tauri.

The interface uses a persistent left library panel, full-width route content, a compact bottom player, pure-black OLED surfaces, and an optional artwork ambience mode.

## Current features

- local music folder import
- recursive native audio scanning
- title, artist, album, duration, and cover metadata
- embedded artwork cache
- imported artwork folders and individual cover images
- randomized fallback artwork for tracks without a real cover
- wide artwork-led Home hero
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
- plain CSS motion and layout

## Development

```powershell
npm install
npm run tauri dev
```

Run the complete local gate with:

```powershell
npm run verify
```

The one project-specific guard is:

```powershell
npm run check
```

See `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, and `docs/DEVELOPMENT.md`.

## Principles

1. React does not own the audio element.
2. Route changes do not recreate playback.
3. Filesystem and metadata work stay native.
4. UI state and domain state stay separate.
5. Real artwork drives visual atmosphere.
6. Motion stays CSS-first and lightweight.
7. Verification stays focused on important contracts.
