import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { PlayerBar } from '@/components/layout/PlayerBar'
import { CommandPalette } from '@/components/overlays/CommandPalette'
import { ToastViewport } from '@/components/overlays/ToastViewport'
import { Sidebar } from '@/components/layout/Sidebar'
import { AmbienceBackdrop } from '@/components/layout/AmbienceBackdrop'
import { PlayerPanels } from '@/components/player/PlayerPanels'
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
  }, [navigate,commandOpen])

  return (
    <div className="app-shell" data-theme={theme} data-has-ambience={artwork ? 'true' : 'false'}>
      <AmbienceBackdrop artwork={artwork} active={theme === 'ambience'} />
      <Sidebar />
      <main className="app-shell__content"><Outlet /></main>
      <PlayerPanels />
      <CoverPicker />
      <CommandPalette open={commandOpen} onClose={()=>setCommandOpen(false)} />
      <ToastViewport />
      <MediaSessionBridge />
      <PlayerBar />
    </div>
  )
}
