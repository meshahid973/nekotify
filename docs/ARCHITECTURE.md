# Nekotify Architecture

Nekotify keeps presentation, playback, and native library work separate so the desktop app stays small as the library grows.

## Runtime layers

```text
React routes and presentation
        |
focused Zustand stores
        |
AudioEngine / library boundary
        |
Tauri commands
        |
Rust scanners and metadata reader
```

## Frontend ownership

- `src/app` composes the router and application root.
- `src/components` owns reusable UI such as the sidebar, player, and track hero.
- `src/features/library` owns imported music/artwork state, rows, and playback actions.
- `src/features/playback` owns the single browser audio engine and semantic playback state.
- `src/features/queue` owns queue order and cursor rules.
- `src/pages` composes routes and does not scan the filesystem.
- `src/stores` owns small UI preferences such as theme and density.

## Local library

Rust owns folder/file selection and filesystem scanning.

Music folders are scanned recursively for audio supported by Lofty. Title, artist, album, duration, embedded artwork, and common local cover files are read natively. Embedded covers are cached in the app cache.

Artwork can also come from:

- an imported artwork folder;
- an individually imported cover image.

Imported artwork becomes a pool. Fallback selections are kept stable across library refreshes and can be explicitly reshuffled. User-selected per-track cover overrides are stored in SQLite and do not replace the original media tags.

Only discovered media and artwork files are exposed through the Tauri asset protocol.

## Playback

There is exactly one `AudioEngine` singleton and it is the only module allowed to construct an `HTMLAudioElement`.

React and Zustand do not own the audio element. Route changes do not recreate playback. Progress snapshots remain bounded.

## Layout

The desktop shell fills the viewport instead of centering the app inside a fixed-width canvas. OLED defaults to black and white, while Ambience reaches the sidebar behind translucent chrome. The sidebar and player stay persistent while route content uses the full remaining width.

The Home hero is a reusable React component with artwork on the right and metadata/actions on the left. The hero stays a fixed-height banner and cleans remix suffixes only for display. Motion springs are limited to the sidebar, tabs and playback sliders; other effects use CSS. All honor reduced-motion settings.

## Themes

Nekotify has two visual modes:

- **OLED** — pure-black application background with opaque dark chrome.
- **Ambience** — the currently selected track artwork becomes a blurred, darkened application backdrop.

No decorative glow-orb system is used.

## Tauri

The default capability remains narrow. Native pickers run through the dialog plugin; broad frontend filesystem or shell permissions are not granted.

The packaged webview uses an explicit CSP and the asset protocol is enabled for approved local media and artwork.
