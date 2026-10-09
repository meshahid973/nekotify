# Nekotify Phase 7 — Rust-first library improvements

This is a four-PR migration, built on the merged Phase 6 main branch.
All work is in the existing repository; no alternate project copies or
local Windows worktrees are created.

## Implemented in the PR stack

1. **Safety and cached startup:** native cached_library returns the durable
   SQLite index without walking the music directories. The UI renders it before
   the full asynchronous scan. Scan failures, unavailable drives, denied
   subfolders, and cancellation do not trigger a global destructive prune.
   Original music bytes and existing playlist/favorite path keys stay intact.
2. **Indexed queries:** SQLite FTS5 title/artist/album indexing is maintained
   by triggers. Rust commands search_library and query_tracks return at most
   100 records per IPC reply. User-provided tokens are safely escaped.
3. **Coordinated scan and artwork:** only one scan writes the index at a time.
   Cancellation, bounded progress events and 20 MiB embedded-cover limits
   prevent runaway work. Embedded artwork writes use same-directory temp files
   and rename so an interruption cannot leave a partly written final cover.
4. **Client integration:** Search and command palette use the native index
   with a legacy substring fallback. Search pages 80 records at a time.
   React Router lazily loads Home, Library, Search and Settings page modules.
   The query implementation is isolated from the scanner in
   `src-tauri/src/library/queries.rs`.
   The database schema and FTS index are initialized once per process, rather
   than replaying DDL on every metadata or search query.

## Existing behavior preserved

The persistent WebView2 AudioEngine remains the only decoder/output owner.
The same SQLite database, favorites, playlists, history and artwork overrides
are retained. The full library snapshot remains available temporarily for
queue, album grouping and older components during migration. A Rust query
endpoint alone does NOT make the entire library paginated in every view.

## Deferred — not represented as already implemented

- Native file watcher with bounded incremental per-file invalidation.
- SQLite stable track IDs independent of file paths and transactional migration.
- CPU-friendly pre-resized artwork variants, a disk eviction manifest.
- Windows System Media Transport Controls, tray, autostart/window-state plugin.
- Replacing WebView2 audio with experimental Symphonia/CPAL playback.

These features require separate Windows runtime and data-migration verification.
They should not be silently rolled into a risky four-PR release.

## Verification / measurement

CI: npm test, TypeScript, ESLint, Vite build/bundle guard, Windows cargo
check, Clippy and rustfmt; Rust unit tests validate literal FTS term escaping.
Measure warm/cold startup, 1k/10k/100k search p50/p95, idle CPU/memory and
scan under playback with release binaries before publishing numerical gains.
No synthetic benchmark has yet established the claimed Phase 7 targets.
