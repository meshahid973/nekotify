# Performance Contract

Performance is a product requirement for Nekotify, not a cleanup task.

## Phase 1 budgets

- Total built JavaScript: **under 120 KiB gzip**
- Total built CSS: **under 20 KiB gzip**
- Idle animation loops: **zero**
- Global playback updates: **bounded; never requestAnimationFrame-driven**
- Heavy component libraries: **none**
- Full icon-library imports: **none**

`npm run check:bundle` measures built JS and CSS after `npm run build`.

These budgets can change when real features justify them, but they must change deliberately and be documented.

## Playback

The browser audio clock is more precise than React needs to be. `AudioEngine` publishes progress at a 250 ms interval while playback is active and stops the interval while paused, ended, or errored.

The audio element remains outside React and Zustand.

## Images

Phase 1 exposes a single Artwork component. Phase 2 will make thumbnail size explicit and move extraction, resizing, hashing, dominant-color work, and disk caching to Rust/native services.

Large embedded cover images must never be decoded independently in every visible card.

## Motion

CSS handles the Phase 1 motion system. There is no animation framework and no permanent JavaScript animation loop.

Both `prefers-reduced-motion` and Nekotify's explicit Reduced setting collapse motion durations.

## Lists

TanStack Virtual is already available for the Phase 2 song table. Large libraries must not map tens of thousands of tracks directly into DOM nodes.

## Adding dependencies

Before adding a runtime dependency, check:

1. Can the platform already do it?
2. Is the feature loaded on startup?
3. Is the package tree-shakeable?
4. Does it add background work while idle?
5. Can the feature be lazy or native instead?
