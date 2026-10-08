import { usePlaybackStore } from '@/features/playback/playback.store'
import { useQueueStore } from '@/features/queue/queue.store'
import type { Track } from '@/types/media'

export async function playLibraryTrack(track: Track, tracks: Track[]) {
  const index = tracks.findIndex((candidate) => candidate.id === track.id)
  const playback = usePlaybackStore.getState()

  if (
    playback.track?.id === track.id &&
    (playback.status === 'playing' || playback.status === 'loading')
  ) {
    playback.pause()
    return
  }

  if (playback.track?.id !== track.id) {
    useQueueStore.getState().setQueue(tracks, index >= 0 ? index : 0)
    playback.loadTrack(track)
  } else if (useQueueStore.getState().items.length === 0) {
    useQueueStore.getState().setQueue(tracks, index >= 0 ? index : 0)
  }

  try {
    await playback.play()
  } catch {
    // The audio engine already exposes the error to the player.
  }
}
