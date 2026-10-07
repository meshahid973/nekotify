import type { Track } from '@/types/media'

export interface QueueSnapshot {
  items: Track[]
  currentIndex: number
}
