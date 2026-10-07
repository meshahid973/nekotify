import { create } from 'zustand'

import {
  insertTrackNext,
  moveQueueItem,
  normalizeQueueIndex,
  removeQueueItem,
} from '@/features/queue/queue.utils'
import type { Track } from '@/types/media'

interface QueueState {
  items: Track[]
  currentIndex: number
  setQueue: (items: Track[], startIndex?: number) => void
  enqueue: (track: Track) => void
  playNext: (track: Track) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  clear: () => void
  advance: () => Track | null
  previous: () => Track | null
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  currentIndex: -1,

  setQueue: (items, startIndex = 0) =>
    set({
      items: [...items],
      currentIndex: normalizeQueueIndex(items.length, startIndex),
    }),

  enqueue: (track) =>
    set((state) => ({
      items: [...state.items, track],
      currentIndex: state.currentIndex < 0 ? 0 : state.currentIndex,
    })),

  playNext: (track) =>
    set((state) => ({
      items: insertTrackNext(state.items, state.currentIndex, track),
      currentIndex: state.currentIndex < 0 ? 0 : state.currentIndex,
    })),

  remove: (index) =>
    set((state) => removeQueueItem(state.items, state.currentIndex, index)),

  move: (from, to) =>
    set((state) => ({
      items: moveQueueItem(state.items, from, to),
      currentIndex:
        state.currentIndex === from
          ? to
          : state.currentIndex,
    })),

  clear: () => set({ items: [], currentIndex: -1 }),

  advance: () => {
    const { items, currentIndex } = get()
    const nextIndex = currentIndex + 1

    if (nextIndex < 0 || nextIndex >= items.length) {
      return null
    }

    set({ currentIndex: nextIndex })
    return items[nextIndex]
  },

  previous: () => {
    const { items, currentIndex } = get()
    const previousIndex = currentIndex - 1

    if (previousIndex < 0 || previousIndex >= items.length) {
      return null
    }

    set({ currentIndex: previousIndex })
    return items[previousIndex]
  },
}))
