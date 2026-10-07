# Nekotify

Nekotify is a lightweight, local-first desktop music player built with React, TypeScript, Vite, and Tauri.

Its visual direction borrows the strongest parts of NekoWatch's current design language: near-black surfaces, restrained glass chrome, wide editorial spacing, strong typography, subtle artwork atmosphere, and minimal filled panels. Music library tiles remain compact and conventional rather than copying anime-card layouts.

## Status

Nekotify is currently in **Phase 1 — Foundation**.

Phase 1 establishes the desktop shell, routing, visual system, playback and queue boundaries, native runtime configuration, accessibility rules, and performance contracts. Local library scanning and metadata indexing begin in Phase 2.

## Stack

- React 19 + TypeScript
- Vite
- Tauri 2 + Rust
- React Router
- Zustand
- TanStack Virtual
- Lucide React
- Plain CSS with design tokens

## Development

```powershell
npm install
npm run tauri dev
```

The normal full check is intentionally one command:

```powershell
npm run verify
```

For the lightweight Nekotify-specific architecture/bundle guard only:

```powershell
npm run check
```

## Architecture

- `src/app` — application composition and routing
- `src/components` — reusable visual primitives and persistent chrome
- `src/features` — playback and queue domain behavior
- `src/pages` — route composition
- `src/stores` — small cross-cutting UI preferences
- `src/styles` — design tokens, reset, global rules, motion
- `src/types` — shared domain contracts

The Rust side remains intentionally small until native features have real ownership.

See `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, and `docs/DEVELOPMENT.md`.

## Principles

1. React does not own the audio element.
2. Route changes never recreate playback.
3. Stores stay domain-specific.
4. Heavy native work belongs in Rust.
5. Features are not exposed before they work.
6. Visual richness should come from composition and artwork, not a heavy UI runtime.
7. Testing stays focused on important contracts rather than growing into hundreds of bespoke scripts.

## License

MIT
