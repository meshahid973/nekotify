# Workspace Layout (Phase 6A)

The permanent player remains below the resizable workspace.
The upper workspace uses react-resizable-panels Group, Panel, and Separator.
Sidebar collapse is explicit (button / Ctrl+B), keyboard-accessible, and
remembered alongside sidebar and queue widths in the existing UI store.
When the native WebView viewport is <= 1000px, sidebar collapse is automatic.
Queue opens docked on wide viewports (>= 1350px) and remains a modal drawer
at smaller widths or when the user disables docking. Now Playing remains modal.

No secondary audio engine or new local checkout is created. Music, queue,
library and DB remain in their existing stores. Test keyboard resize of
the separators, Queue opening and closing, sidebar collapse, 800px minimum
width, and Windows WebView2 layout behavior before merge.
