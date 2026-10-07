# Nekotify Architecture

Nekotify keeps presentation, playback, and native library work separate so the desktop app can stay small as the library grows.

## Runtime layers

```text
React routes and presentation
        |
focused Zustand stores
        |
AudioEngine / library feature boundary
        |
Tauri commands
        |
Rust scanner and metadata reader
```

## Frontend ownership

- `src/app` composes the router and application root.
- `src/components` owns reusable UI and the persistent sidebar/player chrome.
- `src/features/library` owns imported folders, mapped tracks, rows, and library playback actions.
- `src/features/playback` owns the single browser audio engine and semantic playback state.
- `src/features/queue` owns queue order and cursor rules.
- `src/pages` composes routes and does not scan the filesystem.
- `src/stores` is for small cross-cutting UI preferences such as theme and density.

## Local library

Rust owns folder selection and filesystem scanning. Imported folder paths are stored in the app data directory and rescanned on startup.

The scanner:

- recursively finds audio formats supported by Lofty;
- reads title, artist, album, duration, and embedded cover art when available;
- falls back to filenames when metadata is missing;
- caches embedded artwork in the app cache directory;
- exposes only runtime-approved local media to the Tauri asset protocol.

The React library store receives a serializable snapshot and maps native paths to asset URLs.

## Playback

There is exactly one `AudioEngine` singleton and it is the only module allowed to construct an `HTMLAudioElement`.

React and Zustand do not own the audio element. Route changes do not recreate playback. Progress snapshots are bounded to four updates per second while playing.

## Themes

Nekotify has two visual modes:

- **OLED**: pure black application background with opaque dark chrome.
- **Ambience**: the currently selected track artwork becomes a blurred, darkened application backdrop.

Ambience uses the actual playing artwork. It does not create decorative color orbs.

## Tauri

The default capability remains narrow. Native folder selection runs in Rust through the dialog plugin; broad frontend filesystem or shell permissions are not granted.

The packaged webview uses an explicit CSP and the Tauri asset protocol is enabled for local media and cached artwork.
