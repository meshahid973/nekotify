import { create } from 'zustand'
import type { Track } from '@/types/media'

interface TrackDetailsState {
  track:Track|null
  open:(track:Track)=>void
  close:()=>void
}
export const useTrackDetailsStore=create<TrackDetailsState>(set=>({
  track:null,
  open:(track)=>set({track}),
  close:()=>set({track:null}),
}))
