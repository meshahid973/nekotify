import { create } from 'zustand'

import { audioEngine } from '@/features/playback/AudioEngine'
import type { PlaybackStatus, RepeatMode } from '@/features/playback/playback.types'
import { clamp } from '@/features/playback/playback.utils'
import { useQueueStore } from '@/features/queue/queue.store'
import { useHistoryStore } from '@/features/history/history.store'
import type { Track } from '@/types/media'

const POSITION_KEY = 'nekotify-playback-positions'
let previousStatus: PlaybackStatus = 'idle'
let loggedTrackId: string | null = null
let lastPositionSave = 0

function getPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    return raw ? JSON.parse(raw) as Record<string, number> : {}
  } catch {
    return {}
  }
}

function positionFor(path: string): number {
  const position = getPositions()[path]
  return Number.isFinite(position) && position > 0 ? position : 0
}

function rememberPosition(path: string, seconds: number) {
  try {
    const positions = getPositions()
    if (seconds <= 0) delete positions[path]
    else positions[path] = Math.max(0, seconds)
    const keys = Object.keys(positions)
    if (keys.length > 500) keys.slice(0, keys.length - 500).forEach((key) => delete positions[key])
    localStorage.setItem(POSITION_KEY, JSON.stringify(positions))
  } catch {
    // Playback must work without local storage.
  }
}

const SETTINGS_KEY = 'nekotify-playback-settings'
interface PlaybackPreferences {
  volume: number
  muted: boolean
  repeatMode: RepeatMode
  shuffle: boolean
}

function loadPreferences(): PlaybackPreferences {
  const defaults: PlaybackPreferences = {
    volume: 1, muted: false, repeatMode: 'off', shuffle: false,
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as Partial<PlaybackPreferences>
    return {
      volume: typeof saved.volume === 'number' && Number.isFinite(saved.volume)
        ? clamp(saved.volume, 0, 1) : defaults.volume,
      muted: typeof saved.muted === 'boolean' ? saved.muted : defaults.muted,
      repeatMode: ['off', 'one', 'all'].includes(saved.repeatMode ?? '')
        ? saved.repeatMode! : defaults.repeatMode,
      shuffle: typeof saved.shuffle === 'boolean' ? saved.shuffle : defaults.shuffle,
    }
  } catch {
    return defaults
  }
}

function savePreferences(state: PlaybackPreferences) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      volume: state.volume, muted: state.muted,
      repeatMode: state.repeatMode, shuffle: state.shuffle,
    }))
  } catch {
    // Playback still works if persistence is unavailable.
  }
}

interface PlaybackState extends PlaybackPreferences {
  track: Track | null
  status: PlaybackStatus
  duration: number
  currentTime: number
  bufferedEnd: number
  error: string | null
  loadTrack: (track: Track) => void
  play: () => Promise<void>
  pause: () => void
  togglePlayback: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMuted: () => void
  setRepeatMode: (mode: RepeatMode) => void
  setShuffle: (enabled: boolean) => void
}

const initial = loadPreferences()

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  ...initial,
  track: null,
  status: 'idle',
  duration: 0,
  currentTime: 0,
  bufferedEnd: 0,
  error: null,

  loadTrack: (track) => {
    const previousTrack = get().track
    if (previousTrack && previousTrack.id !== track.id) {
      const finished = get().duration > 0 && get().currentTime >= get().duration - 1
      rememberPosition(previousTrack.source.path, finished ? 0 : get().currentTime)
    }
    set({ track, status: 'loading', duration: track.duration, currentTime: 0, bufferedEnd: 0, error: null })
    loggedTrackId = null
    audioEngine.load(track.source.uri, positionFor(track.source.path))
  },
  play: async () => {
    if (get().track) await audioEngine.play()
  },
  pause: () => audioEngine.pause(),
  togglePlayback: async () => {
    const { track, status } = get()
    if (!track) return
    if (status === 'playing' || status === 'loading') {
      audioEngine.pause()
    } else {
      await audioEngine.play()
    }
  },
  next: async () => {
    const { shuffle, repeatMode } = get()
    const next = useQueueStore.getState().advance({
      shuffle, repeatMode: repeatMode === 'one' ? 'off' : repeatMode,
    })
    if (!next) return
    get().loadTrack(next)
    await get().play()
  },
  previous: async () => {
    if (get().currentTime > 3) {
      get().seek(0)
      return
    }
    const { shuffle, repeatMode } = get()
    const previous = useQueueStore.getState().previous({
      shuffle, repeatMode: repeatMode === 'one' ? 'off' : repeatMode,
    })
    if (!previous) {
      get().seek(0)
      return
    }
    get().loadTrack(previous)
    await get().play()
  },
  seek: (seconds) => {
    audioEngine.seek(clamp(seconds, 0, Math.max(get().duration, 0)))
  },
  setVolume: (volume) => {
    const safe = clamp(volume, 0, 1)
    set({ volume: safe })
    audioEngine.setVolume(safe)
    savePreferences(get())
  },
  toggleMuted: () => {
    const muted = !get().muted
    set({ muted })
    audioEngine.setMuted(muted)
    savePreferences(get())
  },
  setRepeatMode: (repeatMode) => {
    set({ repeatMode })
    savePreferences(get())
  },
  setShuffle: (shuffle) => {
    set({ shuffle })
    savePreferences(get())
  },
}))

audioEngine.subscribe((snapshot) => {
  const track = usePlaybackStore.getState().track
  if (track) {
    if (snapshot.status === 'playing' && loggedTrackId !== track.id) {
      loggedTrackId = track.id
      void useHistoryStore.getState().record(track.source.path)
    }
    const now = Date.now()
    if (snapshot.status === 'playing' && now - lastPositionSave >= 5000) {
      rememberPosition(track.source.path, snapshot.currentTime)
      lastPositionSave = now
    } else if (snapshot.status === 'paused' && previousStatus !== 'paused') {
      rememberPosition(track.source.path, snapshot.currentTime)
    }
  }
  previousStatus = snapshot.status
  usePlaybackStore.setState({
    status: snapshot.status,
    currentTime: snapshot.currentTime,
    duration: snapshot.duration || usePlaybackStore.getState().duration,
    bufferedEnd: snapshot.bufferedEnd,
    volume: snapshot.volume,
    muted: snapshot.muted,
    error: snapshot.error,
  })
})

// Apply persisted settings after the engine starts listening.
audioEngine.setVolume(initial.volume)
audioEngine.setMuted(initial.muted)

audioEngine.onEnded(() => {
  const player = usePlaybackStore.getState()
  if (player.track) rememberPosition(player.track.source.path, 0)
  if (player.repeatMode === 'one') {
    player.seek(0)
    void player.play().catch(() => undefined)
  } else {
    void player.next().catch(() => undefined)
  }
})
