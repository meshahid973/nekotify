export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'error'

export type RepeatMode = 'off' | 'all' | 'one'

export interface AudioSnapshot {
  status: PlaybackStatus
  currentTime: number
  duration: number
  bufferedEnd: number
  volume: number
  muted: boolean
  error: string | null
}
