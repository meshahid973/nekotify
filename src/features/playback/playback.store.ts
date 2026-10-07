import { create } from 'zustand'

import { audioEngine } from '@/features/playback/AudioEngine'
import type {
  PlaybackStatus,
  RepeatMode,
} from '@/features/playback/playback.types'
import { clamp } from '@/features/playback/playback.utils'
import type { Track } from '@/types/media'

interface PlaybackState {
  track: Track | null
  status: PlaybackStatus
  duration: number
  currentTime: number
  bufferedEnd: number
  volume: number
  muted: boolean
  repeatMode: RepeatMode
  shuffle: boolean
  error: string | null
  loadTrack: (track: Track) => void
  play: () => Promise<void>
  pause: () => void
  togglePlayback: () => Promise<void>
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMuted: () => void
  setRepeatMode: (mode: RepeatMode) => void
  setShuffle: (enabled: boolean) => void
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  track: null,
  status: 'idle',
  duration: 0,
  currentTime: 0,
  bufferedEnd: 0,
  volume: 1,
  muted: false,
  repeatMode: 'off',
  shuffle: false,
  error: null,

  loadTrack: (track) => {
    set({
      track,
      status: 'loading',
      duration: track.duration,
      currentTime: 0,
      bufferedEnd: 0,
      error: null,
    })
    audioEngine.load(track.source.uri)
  },

  play: async () => {
    if (!get().track) {
      return
    }

    await audioEngine.play()
  },

  pause: () => {
    audioEngine.pause()
  },

  togglePlayback: async () => {
    const { track, status } = get()

    if (!track) {
      return
    }

    if (status === 'playing' || status === 'loading') {
      audioEngine.pause()
      return
    }

    await audioEngine.play()
  },

  seek: (seconds) => {
    const duration = get().duration
    audioEngine.seek(clamp(seconds, 0, Math.max(duration, 0)))
  },

  setVolume: (volume) => {
    audioEngine.setVolume(clamp(volume, 0, 1))
  },

  toggleMuted: () => {
    audioEngine.setMuted(!get().muted)
  },

  setRepeatMode: (repeatMode) => set({ repeatMode }),
  setShuffle: (shuffle) => set({ shuffle }),
}))

audioEngine.subscribe((snapshot) => {
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
