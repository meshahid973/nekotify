# Nekotify Architecture

This document describes ownership boundaries, not just folders. Phase 1 is intentionally small so later native library work can plug into the application instead of forcing a rewrite.

## Runtime layers

```text
React routes and presentation
        |
focused Zustand stores
        |
domain services / AudioEngine
        |
typed Tauri boundary
        |
Rust native services (Phase 2+)
```

## Frontend ownership

### `src/app`

Application composition only: router, root providers, and error boundaries.

It must not own playback, queue rules, library indexing, or page-specific behavior.

### `src/components`

Reusable presentation. Components here should be useful without knowing which song, playlist, or library implementation called them.

### `src/features`

Domain behavior. Playback and queue live here now. Library, playlists, lyrics, and search-specific behavior will join them when those features become real.

### `src/pages`

Route composition. Pages assemble components and feature APIs; they do not become service layers.

### `src/services`

Long-lived infrastructure boundaries, especially Tauri/native integration. A service should exist because it owns real work, not because a folder diagram wants it.

### `src/stores`

Small cross-cutting UI state only. Domain stores remain next to their features.

### `src/styles`

Global tokens, reset, motion rules, and global application rules. Component-specific styles are colocated with components.

### `src/types`

Small shared domain contracts. Avoid modeling metadata fields before the native library engine actually provides them.

## Playback contract

There is exactly one `AudioEngine` singleton. It is the only module allowed to construct an `HTMLAudioElement`.

React does not own the audio element. The element is not stored in Zustand. Route changes do not recreate it.

`AudioEngine` emits bounded snapshots. Playback progress is emitted four times per second while playing instead of driving a global 60 FPS render loop.

The playback store contains semantic state such as the current track, status, time, volume, mute state, shuffle, and repeat mode.

## Queue contract

Queue state is separate from playback state. Queue transformations are kept in pure helpers where possible so they can be tested without audio or React.

## Router contract

Nekotify uses a hash router for the desktop bundle. `AppShell` owns the persistent sidebar, route outlet, and player bar. The player stays mounted as Home, Search, Library, and Settings change.

## Tauri contract

Phase 1 keeps `core:default` only. Filesystem, dialog, shell, database, and other native permissions are added only alongside code that needs them.

The production webview has an explicit CSP. Development uses `devCsp: null` so Vite HMR stays isolated to development without weakening the packaged policy.

Rust modules are not created as empty placeholders. Phase 2 will introduce database, library, metadata, artwork, and watcher modules with actual implementations.

## Dependency rule

Prefer platform APIs and small focused packages. A new runtime dependency should solve a concrete problem that would otherwise produce worse code or performance.
