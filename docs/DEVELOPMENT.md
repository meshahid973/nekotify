# Development

## Branches

Keep substantial work off `main`.

```text
feat/phase-1-foundation
feat/playlists
fix/playback-resume
```

## Verification

Nekotify keeps one project-specific guard instead of a large check-script collection:

```powershell
npm run check
```

For the complete local gate:

```powershell
npm run verify
```

That runs TypeScript, ESLint, the production frontend build, the single Nekotify guard, and Cargo format/clippy/test/check.

A packaged release should also pass:

```powershell
npm run tauri build
```

## Frontend features

1. Domain behavior belongs under `src/features/<feature>`.
2. Pages compose feature APIs instead of owning infrastructure.
3. Prefer existing primitives and CSS before adding dependencies.
4. Add global state only when distant owners genuinely need it.
5. Add a project-specific check only for a high-value architectural or security boundary.

## Native library work

Folder picking and filesystem scanning stay in Rust. Do not scatter frontend filesystem permissions or raw Tauri invokes across pages. Extend the library feature/store boundary when adding indexing, file watching, or a database.
