# Interaction Foundation (Phase 6B)

Nekotify uses Base UI 1.8.0 as the accessible primitives underneath the
existing monochrome theme. Base UI owns focus, portal, collision detection,
keyboard traversal and dismissal for:

- Right-click track context menus. Existing visible row actions remain.
- Searchable Add-to-Playlist combobox.
- IconButton tooltips with a single application provider.
- Artwork preview and Ctrl+K command search dialogs.
- URL-controlled Library tabs with keyboard activation and semantic panels.

The playback engine, queue order, native window, and library data are not
replaced. Existing Motion handles only visual animations where retained.
Accessibility is implemented via real primitives rather than extra home-made
global keydown handlers.

The JS budget is explicitly 270 KiB gzip (versus 205 KiB for resizable layout),
because Base UI's focus/selection/positioning primitives increase the measured
bundle to about 251 KiB gzip. This cost is measured on GitHub Actions and
still hard-fails the guard above the new ceiling. Do not add competing UI kits.

Manual Windows WebView2 checks required before merging:
context menu at all window edges; nested artwork preview; Ctrl+K and Escape;
keyboard Tab through a dialog; combobox search + select; Home/Library
navigation and focus; drag Queue and player continuing during resizes.
No browser test framework has been added.
