import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { AppHeader } from '@/components/layout/AppHeader'
import { PlayerBar } from '@/components/layout/PlayerBar'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { useUiStore } from '@/stores/ui.store'

import './AppShell.css'

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest(
      'button, a, input, textarea, select, [contenteditable="true"], [role="slider"]',
    ),
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const density = useUiStore((state) => state.density)
  const motionPreference = useUiStore((state) => state.motionPreference)

  useEffect(() => {
    document.documentElement.dataset.density = density
    document.documentElement.dataset.motion = motionPreference

    return () => {
      delete document.documentElement.dataset.density
      delete document.documentElement.dataset.motion
    }
  }, [density, motionPreference])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey

      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('/search')
        window.requestAnimationFrame(() => {
          document.getElementById('nekotify-search-input')?.focus()
        })
        return
      }

      if (modifier && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        navigate('/library')
        return
      }

      if (isInteractiveTarget(event.target) || modifier || event.altKey) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        void usePlaybackStore.getState().togglePlayback()
        return
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        usePlaybackStore.getState().toggleMuted()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell__content">
        <Outlet />
      </main>
      <PlayerBar />
    </div>
  )
}
