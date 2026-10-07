# Performance Contract

Performance is a product requirement for Nekotify, not a cleanup task.

## Phase 1 budgets

- Built JavaScript: **under 120 KiB gzip**
- Built CSS: **under 24 KiB gzip**
- Idle animation loops: **zero**
- Global playback updates: **bounded**
- Heavy component libraries: **none**
- Full icon-library imports: **none**

The single `npm run check` script also measures the built bundle when `dist/assets` exists. `npm run verify` builds first, so the budget is always checked in the full gate.

## Playback

The browser audio clock is more precise than React needs to be. `AudioEngine` publishes progress at a 250 ms interval only while playback is active.

The audio element remains outside React and Zustand.

## Images

Phase 1 exposes a single Artwork component. Phase 2 moves extraction, resizing, hashing, dominant-color work, and disk caching to native services.

Large embedded cover images must not be independently decoded in every visible tile.

## Motion

CSS owns Phase 1 motion. There is no animation framework and no permanent JavaScript animation loop.

Both `prefers-reduced-motion` and Nekotify's Reduced setting collapse motion durations.

## Lists

TanStack Virtual is reserved for large local-library lists. Thousands of tracks should never map directly to thousands of DOM nodes.

## Dependencies

Add a runtime dependency only when it solves a concrete problem better than the platform or a small local implementation.
