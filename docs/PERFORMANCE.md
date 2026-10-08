# Performance Contract

Performance is a product requirement for Nekotify.

## Current budgets

- Built JavaScript: **under 185 KiB gzip**
- Built CSS: **under 30 KiB gzip**
- Idle JavaScript animation loops: **zero**
- Global playback progress: **bounded**
- Heavy component libraries: **none**
- Motion: **one pinned dependency**, limited to sidebar/tab springs and seek/volume interactions.

The single `npm run check` script measures the built bundle when `dist/assets` exists. The JavaScript budget was explicitly raised from 135 KiB to 185 KiB for the requested Motion controls; CI must still fail on further unbounded growth.

## Playback

`AudioEngine` publishes progress every 250 ms while playback is active and stops its timer while paused or ended.

## Library scanning

Filesystem traversal and metadata parsing run on Tauri's blocking worker pool rather than the webview thread.

Embedded artwork is extracted once to the app cache and then served through the local asset protocol instead of converting full images to base64 for every card.

## Ambience

The ambience theme uses the playing artwork (plus one temporary outgoing layer during a track switch) with CSS blur and darkening, shared by content, sidebar and player. It does not run canvas shaders, palette extraction, animated color fields, or permanent JavaScript effects.

## Large libraries

Library and Search already use TanStack Virtual to keep mounted song rows bounded.

## Dependencies

Add a runtime dependency only when it solves a concrete problem better than the platform or a small local implementation.
