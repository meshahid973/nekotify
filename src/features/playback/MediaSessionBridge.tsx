import { useEffect } from 'react'

import { usePlaybackStore } from '@/features/playback/playback.store'

function supportedSession(): MediaSession | null {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
    ? navigator.mediaSession
    : null
}

export function MediaSessionBridge() {
  const track = usePlaybackStore((state) => state.track)
  const status = usePlaybackStore((state) => state.status)
  const duration = usePlaybackStore((state) => state.duration)
  const currentSecond = usePlaybackStore((state) => Math.floor(state.currentTime))

  useEffect(() => {
    const session = supportedSession()
    if (!session) return
    if (track && typeof MediaMetadata !== 'undefined') {
      session.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album ?? '',
        artwork: track.artwork
          ? [{ src: track.artwork.uri, sizes: 'any' }]
          : [],
      })
    } else {
      session.metadata = null
    }

    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => void usePlaybackStore.getState().play().catch(() => undefined),
      pause: () => usePlaybackStore.getState().pause(),
      nexttrack: () => void usePlaybackStore.getState().next().catch(() => undefined),
      previoustrack: () => void usePlaybackStore.getState().previous().catch(() => undefined),
      seekto: (details) => {
        if (typeof details.seekTime === 'number') {
          usePlaybackStore.getState().seek(details.seekTime)
        }
      },
      seekbackward: (details) => {
        const player = usePlaybackStore.getState()
        player.seek(player.currentTime - (details.seekOffset ?? 10))
      },
      seekforward: (details) => {
        const player = usePlaybackStore.getState()
        player.seek(player.currentTime + (details.seekOffset ?? 10))
      },
    }

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        session.setActionHandler(action as MediaSessionAction, handler)
      } catch {
        // Not every WebView implements every Media Session action.
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          session.setActionHandler(action as MediaSessionAction, null)
        } catch {
          // Ignore unsupported actions during cleanup.
        }
      }
      session.metadata = null
    }
  }, [track])

  useEffect(() => {
    const session = supportedSession()
    if (!session) return
    session.playbackState =
      status === 'playing' ? 'playing' :
        status === 'idle' || status === 'error' ? 'none' : 'paused'
    if (duration > 0 && Number.isFinite(duration)) {
      try {
        session.setPositionState({
          duration,
          position: Math.min(Math.max(0, currentSecond), duration),
          playbackRate: 1,
        })
      } catch {
        // WebView media sessions may not support position state.
      }
    }
  }, [currentSecond, duration, status])

  return null
}
