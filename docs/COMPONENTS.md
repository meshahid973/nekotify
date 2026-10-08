# Phase 5 — Component adoption

PR stack:

1. **Functional controls**: Ctrl+K command palette, right-click track
   context actions, toast notifications, searchable playlist combobox,
   tooltips and spring button feedback.
2. **Navigation and panels**: spring queue drawer, animated queue rows with
   native keyboard/drag reordering, artwork image viewer, expandable imported
   folder tree. Existing sidebar indicator, tabs and seek slider already
   follow beUI-style Motion patterns from Phase 4.
3. **React Bits polish**: optional Quick Spin (OptionWheel), favorite pulse
   (animation only), Squish Switch in Settings, elastic volume feedback,
   understated Chroma album grid and limited Home list entrances.

Principles: no remote images, no fake songs or actions, one existing Motion
runtime, preserve Tauri local-media APIs, no heavy shaders or GSAP.
The option wheel is disabled by default and never starts playback when
browsing choices. Reduced-motion users get a native select control.

Check the stacked PRs in order; do not merge until CI and on-device testing
for import, play, queue, artwork and keyboard shortcuts succeeds.
