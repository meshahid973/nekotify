# Nekotify

Nekotify is a lightweight, local desktop music player built with React, TypeScript, Vite, and Tauri.

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
6. Motion stays CSS and lightweight.
7. Verification stays focused on important contracts.
