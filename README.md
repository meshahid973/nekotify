# Nekotify

Nekotify is a lightweight, local-first desktop music player built with React, TypeScript, Vite, and Tauri.

The project is designed around a simple rule: the interface can feel rich without making the runtime heavy. React owns presentation, Tauri/Rust owns native work, and playback is kept outside route lifecycles so navigation never interrupts audio.

## Status

Nekotify is currently in **Phase 1 — Foundation**.

Phase 1 establishes the application shell, routing, design system, playback and queue boundaries, native runtime configuration, accessibility rules, and performance contracts. Local library scanning and metadata indexing begin in Phase 2.

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

Useful checks:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run rust:fmt
npm run rust:clippy
npm run rust:test
npm run rust:check
```

Run the full verification set with:

```powershell
npm run verify
```

## Architecture

The frontend is split by responsibility:

- `src/app` — application composition, router, error boundaries
- `src/components` — reusable presentation primitives and layout
- `src/features` — domain behavior such as playback and queue
- `src/pages` — route composition
- `src/services` — long-lived infrastructure boundaries
- `src/stores` — small cross-cutting UI stores
- `src/styles` — tokens, reset, global styles, motion
- `src/types` — shared domain types

The Rust side remains intentionally small until native features have real ownership. Empty placeholder modules are not added just to make the tree look complete.

See `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, and `docs/DEVELOPMENT.md` as Phase 1 lands.

## Principles

1. React does not own the audio element.
2. Route changes must not recreate playback.
3. Stores stay domain-specific.
4. Heavy native work belongs in Rust.
5. Features are not exposed before they work.
6. Performance budgets are treated as product requirements.

## License

MIT
