import { usePlaybackStore } from '@/features/playback/playback.store'
import { useQueueStore } from '@/features/queue/queue.store'
import type { Track } from '@/types/media'

export async function playLibraryTrack(track: Track, tracks: Track[]) {
  const index = tracks.findIndex((candidate) => candidate.id === track.id)
  const playback = usePlaybackStore.getState()

  useQueueStore.getState().setQueue(tracks, index >= 0 ? index : 0)

  if (playback.track?.id !== track.id) {
    playback.loadTrack(track)
  }

  try {
    await playback.play()
  } catch {
    // AudioEngine already publishes the playback error to the store.
  }
}
