# Performance Contract

Performance is a product requirement for Nekotify.

## Current budgets

- Built JavaScript: **under 130 KiB gzip**
- Built CSS: **under 28 KiB gzip**
- Idle JavaScript animation loops: **zero**
- Global playback progress: **bounded**
- Heavy component libraries: **none**

The single `npm run check` script measures the built bundle when `dist/assets` exists.

## Playback

`AudioEngine` publishes progress every 250 ms while playback is active and stops its timer while paused or ended.

## Library scanning

Filesystem traversal and metadata parsing run on Tauri's blocking worker pool rather than the webview thread.

Embedded artwork is extracted once to the app cache and then served through the local asset protocol instead of converting full images to base64 for every card.

## Ambience

The ambience theme uses one currently playing artwork layer with CSS blur and darkening. It does not run canvas shaders, palette extraction, animated color fields, or permanent JavaScript effects.

## Large libraries

The current row model is ready for virtualization. TanStack Virtual is already available and should be enabled when large-library rendering work lands.

## Dependencies

Add a runtime dependency only when it solves a concrete problem better than the platform or a small local implementation.
