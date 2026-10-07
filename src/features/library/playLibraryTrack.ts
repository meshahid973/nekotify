import { usePlaybackStore } from '@/features/playback/playback.store'
import { useQueueStore } from '@/features/queue/queue.store'
import type { Track } from '@/types/media'

export async function playLibraryTrack(track: Track, tracks: Track[]) {
  const index = tracks.findIndex((candidate) => candidate.id === track.id)
  const playback = usePlaybackStore.getState()

  if (playback.track?.id === track.id &&\n    (playback.status === 'playing' || playback.status === 'loading')) {
    playback.pause()
    return
  }

  useQueueStore.getState().setQueue(tracks, index >= 0 ? index : 0)

  if (playback.track?.id !== track.id) {
    playback.loadTrack(track)
  }

  try {
    await playback.play()
  } catch {
    // AudioEngine publishes playback errors to the store.
  }
}
