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
- Motion for React (targeted spring interactions) + CSS layout

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
6. CSS handles micro-interactions; one bounded Motion dependency handles spring indicators and sliders.
7. Verification stays focused on important contracts.
