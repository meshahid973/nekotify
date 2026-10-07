# Development

## Branches

Use short scoped branches:

```text
feat/phase-1-foundation
feat/local-library
fix/playback-resume
```

Do not develop substantial features directly on `main`.

## Commit style

Use small conventional commits that leave the branch buildable:

```text
chore: harden project metadata
refactor: establish application architecture
feat: add persistent playback foundation
fix: preserve queue cursor on reorder
docs: document performance contract
```

## Required checks

Before a Phase 1 merge:

```powershell
npm run check:foundation
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run check:bundle

npm run rust:fmt
npm run rust:clippy
npm run rust:test
npm run rust:check
```

Or run:

```powershell
npm run verify
```

A production Tauri build should also be verified before release:

```powershell
npm run tauri build
```

## Adding frontend features

1. Put domain behavior under `src/features/<feature>`.
2. Keep route components under `src/pages` focused on composition.
3. Reuse primitives before introducing new UI abstractions.
4. Add global state only when multiple distant owners genuinely need it.
5. Avoid creating barrel exports by default.
6. Update architecture/performance checks when a new contract is introduced.

## Adding native features

Add a Tauri capability only when its implementation lands. Prefer a narrow permission over a wildcard. Keep native work behind a typed frontend service rather than scattering `invoke` calls across pages.

Phase 2 will establish the first real native commands for local library work.
