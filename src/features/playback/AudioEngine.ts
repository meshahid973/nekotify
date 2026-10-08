import type {
  AudioSnapshot,
  PlaybackStatus,
} from '@/features/playback/playback.types'
import { clamp } from '@/features/playback/playback.utils'

type AudioEngineListener = (snapshot: AudioSnapshot) => void
const PROGRESS_INTERVAL_MS = 250

class AudioEngine {
  private audio: HTMLAudioElement | null = null
  private listeners = new Set<AudioEngineListener>()
  private endedListeners = new Set<() => void>()
  private status: PlaybackStatus = 'idle'
  private error: string | null = null
  private progressTimer: number | null = null
  private pendingSeek = 0

  load(uri: string, resumeAt = 0) {
    const audio = this.getAudio()
    this.stopProgressTimer()
    this.pendingSeek = Math.max(0, resumeAt)
    this.status = 'loading'
    this.error = null
    audio.src = uri
    audio.load()
    this.emit()
  }

  async play() {
    const audio = this.getAudio()
    if (!audio.src) return

    try {
      await audio.play()
    } catch (error) {
      // An interrupted play promise is expected when the user quickly skips tracks.
      if (error instanceof DOMException && error.name === 'AbortError') return
      this.status = 'error'
      this.error = error instanceof Error ? error.message : 'Unable to start playback.'
      this.stopProgressTimer()
      this.emit()
      throw error
    }
  }

  pause() {
    this.getAudio().pause()
  }

  seek(seconds: number) {
    const audio = this.getAudio()
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0
    audio.currentTime = clamp(seconds, 0, Math.max(duration, 0))
    this.emit()
  }

  setVolume(volume: number) {
    this.getAudio().volume = clamp(volume, 0, 1)
  }

  setMuted(muted: boolean) {
    this.getAudio().muted = muted
  }

  subscribe(listener: AudioEngineListener) {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => { this.listeners.delete(listener) }
  }

  onEnded(listener: () => void) {
    this.endedListeners.add(listener)
    return () => { this.endedListeners.delete(listener) }
  }

  snapshot(): AudioSnapshot {
    const audio = this.audio
    if (!audio) {
      return {
        status: this.status, currentTime: 0, duration: 0,
        bufferedEnd: 0, volume: 1, muted: false, error: this.error,
      }
    }

    return {
      status: this.status,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      bufferedEnd: this.getBufferedEnd(audio),
      volume: audio.volume,
      muted: audio.muted,
      error: this.error,
    }
  }

  private getAudio() {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'metadata'

    audio.addEventListener('loadstart', () => {
      this.status = 'loading'
      this.error = null
      this.emit()
    })
    audio.addEventListener('loadedmetadata', () => {
      if (this.pendingSeek > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(this.pendingSeek, Math.max(0, audio.duration - 1))
      }
      this.pendingSeek = 0
      this.status = audio.paused ? 'paused' : 'playing'
      this.emit()
    })
    audio.addEventListener('canplay', () => {
      if (this.status === 'loading') this.status = audio.paused ? 'paused' : 'playing'
      this.emit()
    })
    audio.addEventListener('play', () => {
      this.status = 'playing'
      this.error = null
      this.startProgressTimer()
      this.emit()
    })
    audio.addEventListener('pause', () => {
      if (!audio.ended && this.status !== 'error') this.status = audio.src ? 'paused' : 'idle'
      this.stopProgressTimer()
      this.emit()
    })
    audio.addEventListener('waiting', () => {
      if (!audio.paused) {
        this.status = 'loading'
        this.emit()
      }
    })
    audio.addEventListener('progress', () => this.emit())
    audio.addEventListener('durationchange', () => this.emit())
    audio.addEventListener('volumechange', () => this.emit())
    audio.addEventListener('ended', () => {
      this.status = 'paused'
      this.stopProgressTimer()
      this.emit()
      this.endedListeners.forEach((listener) => listener())
    })
    audio.addEventListener('error', () => {
      this.status = 'error'
      this.error = audio.error?.message || 'Unable to play this track.'
      this.stopProgressTimer()
      this.emit()
    })
    this.audio = audio
    return audio
  }

  private getBufferedEnd(audio: HTMLAudioElement) {
    if (!audio.buffered.length) return 0
    return audio.buffered.end(audio.buffered.length - 1)
  }

  private startProgressTimer() {
    if (this.progressTimer !== null) return
    this.progressTimer = window.setInterval(() => this.emit(), PROGRESS_INTERVAL_MS)
  }

  private stopProgressTimer() {
    if (this.progressTimer === null) return
    window.clearInterval(this.progressTimer)
    this.progressTimer = null
  }

  private emit() {
    const snapshot = this.snapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

export const audioEngine = new AudioEngine()
