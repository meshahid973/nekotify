import { usePlaybackStore } from '@/features/playback/playback.store'
import { useQueueStore } from '@/features/queue/queue.store'
import type { Track } from '@/types/media'

export async function playLibraryTrack(track: Track, tracks: Track[]) {
  const index = tracks.findIndex((candidate) => candidate.id === track.id)

  useQueueStore.getState().setQueue(tracks, index >= 0 ? index : 0)

  const playback = usePlaybackStore.getState()
  playback.loadTrack(track)
  await playback.play()
}
