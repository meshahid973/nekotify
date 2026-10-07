import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { PlayerBar } from '@/components/layout/PlayerBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { useUiStore } from '@/stores/ui.store'

import './AppShell.css'

export function AppShell() {
  const navigate = useNavigate()
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed)
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
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <div
      className="app-shell"
      data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
    >
      <Sidebar />
      <main className="app-shell__content">
        <Outlet />
      </main>
      <PlayerBar />
    </div>
  )
}
