# Development

## Branches

Use short scoped branches and avoid substantial feature work directly on `main`.

```text
feat/phase-1-foundation
feat/local-library
fix/playback-resume
```

## Keep verification small

Nekotify intentionally does not copy NekoWatch's large check-script collection.

There is one project-specific guard:

```powershell
npm run check
```

It verifies the few Phase 1 contracts that are easy to accidentally break: one AudioEngine owner, no heavy UI framework, narrow Tauri permissions, correct app metadata, starter cleanup, and the built bundle budget when `dist` exists.

For the full local gate:

```powershell
npm run verify
```

That runs TypeScript, ESLint, a production frontend build, the single Nekotify guard, and the important Rust checks.

Before a release, also verify the packaged desktop app:

```powershell
npm run tauri build
```

## Adding frontend features

1. Domain behavior belongs under `src/features/<feature>`.
2. Pages compose features; they do not become service layers.
3. Prefer existing primitives and CSS before adding dependencies.
4. Add global state only when distant owners genuinely need it.
5. Add a new project-specific check only when it protects a high-value architectural or safety boundary.

## Adding native features

Add Tauri permissions only alongside the implementation that needs them. Prefer narrow permissions over wildcards and keep native calls behind a small typed service boundary.
