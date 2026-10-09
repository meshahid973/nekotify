import { useEffect, useState } from 'react'
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels'
import { Outlet, useNavigate } from 'react-router-dom'

import { PlayerBar } from '@/components/layout/PlayerBar'
import { CommandPalette } from '@/components/overlays/CommandPalette'
import { ToastViewport } from '@/components/overlays/ToastViewport'
import { Sidebar } from '@/components/layout/Sidebar'
import { useMediaQuery } from '@/components/layout/useMediaQuery'
import { AmbienceBackdrop } from '@/components/layout/AmbienceBackdrop'
import { DockedQueue, PlayerPanels } from '@/components/player/PlayerPanels'
import { usePlayerPanelsStore } from '@/features/playback/player-panels.store'
import { MediaSessionBridge } from '@/features/playback/MediaSessionBridge'
import { CoverPicker } from '@/features/library/CoverPicker'
import { useLibraryStore } from '@/features/library/library.store'
import { useHistoryStore } from '@/features/history/history.store'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { useUiStore } from '@/stores/ui.store'

import './AppShell.css'

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest(
    'button, a, input, textarea, select, [contenteditable="true"], [role="slider"]',
  ))
}

export function AppShell() {
  const navigate = useNavigate()
  const [commandOpen,setCommandOpen] = useState(false)
  const density = useUiStore((state) => state.density)
  const motionPreference = useUiStore((state) => state.motionPreference)
  const theme = useUiStore((state) => state.theme)
  const artwork = usePlaybackStore((state) => state.track?.artwork?.uri)
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed)
  const sidebarPercent = useUiStore((state) => state.sidebarPercent)
  const queuePercent = useUiStore((state) => state.queuePercent)
  const queueDocked = useUiStore((state) => state.queueDocked)
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed)
  const isNarrow = useMediaQuery('(max-width: 1000px)')
  const canDockQueue = useMediaQuery('(min-width: 1350px)')
  const activePanel = usePlayerPanelsStore((state) => state.openPanel)
  const isDockedQueue = queueDocked && canDockQueue && activePanel === 'queue'
  const effectiveCollapsed = sidebarCollapsed || isNarrow
  const sidebarRef = usePanelRef()

  useEffect(() => {
    document.documentElement.dataset.density = density
    document.documentElement.dataset.motion = motionPreference
    document.documentElement.dataset.theme = theme
    return () => {
      delete document.documentElement.dataset.density
      delete document.documentElement.dataset.motion
      delete document.documentElement.dataset.theme
    }
  }, [density, motionPreference, theme])

  useEffect(() => {
    if (effectiveCollapsed) sidebarRef.current?.collapse()
    else sidebarRef.current?.expand()
  }, [effectiveCollapsed, sidebarRef])

  useEffect(() => {
    void useLibraryStore.getState().refresh()
    void useCollectionsStore.getState().refresh()
    void useHistoryStore.getState().refresh()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((value)=>!value)
        return
      }
      if (commandOpen || event.key === 'Escape') return
      if (modifier && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setSidebarCollapsed(!useUiStore.getState().sidebarCollapsed)
        return
      }
      if (modifier && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        navigate('/library')
        return
      }
      if (isInteractiveTarget(event.target) || modifier || event.altKey) return
      if (event.code === 'Space') {
        event.preventDefault()
        void usePlaybackStore.getState().togglePlayback().catch(() => undefined)
        return
      }
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        usePlaybackStore.getState().toggleMuted()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate,commandOpen,setSidebarCollapsed])

  return (
    <div className="app-shell" data-theme={theme} data-has-ambience={artwork ? 'true' : 'false'}>
      <AmbienceBackdrop artwork={artwork} active={theme === 'ambience'} />
      <Group className="app-shell__workspace" orientation="horizontal" id="nekotify-workspace"
        onLayoutChanged={(layout, details) => {
          if (!details.isUserInteraction) return
          const ui = useUiStore.getState()
          if (typeof layout.sidebar === 'number' && layout.sidebar > 9)
            ui.setSidebarPercent(layout.sidebar)
          if (isDockedQueue && typeof layout.queue === 'number')
            ui.setQueuePercent(layout.queue)
        }}>
        <Panel id="sidebar" panelRef={sidebarRef} collapsible collapsedSize="72px"
          minSize="195px" maxSize="340px"
          defaultSize={effectiveCollapsed ? '72px' : `${sidebarPercent}%`}
          groupResizeBehavior="preserve-pixel-size"
          onResize={(size) => {
            const collapsed = size.inPixels < 130
            if (!isNarrow && collapsed !== useUiStore.getState().sidebarCollapsed)
              useUiStore.getState().setSidebarCollapsed(collapsed)
          }}>
          <Sidebar collapsed={effectiveCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            showCollapseButton={!isNarrow}/>
        </Panel>
        <Separator className="workspace__separator" aria-label="Resize sidebar"/>
        <Panel id="main" minSize="370px">
          <main className="app-shell__content"><Outlet /></main>
        </Panel>
        {isDockedQueue ? <>
          <Separator className="workspace__separator" aria-label="Resize queue"/>
          <Panel id="queue" defaultSize={`${queuePercent}%`}
            minSize="270px" maxSize="480px" groupResizeBehavior="preserve-pixel-size">
            <DockedQueue />
          </Panel>
        </> : null}
      </Group>
      <PlayerPanels dockedQueue={isDockedQueue} />
      <CoverPicker />
      <CommandPalette open={commandOpen} onClose={()=>setCommandOpen(false)} />
      <ToastViewport />
      <MediaSessionBridge />
      <PlayerBar />
    </div>
  )
}
