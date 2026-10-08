import { create } from 'zustand'

import {
  insertTrackNext,
  moveQueueCursor,
  moveQueueItem,
  normalizeQueueIndex,
  removeQueueItem,
} from '@/features/queue/queue.utils'
import type { RepeatMode } from '@/features/playback/playback.types'
import type { Track } from '@/types/media'

interface QueueNavigation {
  shuffle?: boolean
  repeatMode?: RepeatMode
}

interface QueueState {
  items: Track[]
  currentIndex: number
  history: number[]
  visited: number[]
  setQueue: (items: Track[], startIndex?: number) => void
  select: (index: number) => Track | null
  enqueue: (track: Track) => void
  playNext: (track: Track) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  clear: () => void
  advance: (options?: QueueNavigation) => Track | null
  previous: (options?: QueueNavigation) => Track | null
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  currentIndex: -1,
  history: [],
  visited: [],

  setQueue: (items, startIndex = 0) => {
    const currentIndex = normalizeQueueIndex(items.length, startIndex)
    set({
      items: [...items],
      currentIndex,
      history: currentIndex < 0 ? [] : [currentIndex],
      visited: currentIndex < 0 ? [] : [currentIndex],
    })
  },

  select: (index) => {
    const state = get()
    if (index < 0 || index >= state.items.length) return null
    set({ currentIndex: index, history: [index], visited: [index] })
    return state.items[index]
  },

  enqueue: (track) => set((state) => ({ items: [...state.items, track] })),

  playNext: (track) =>
    set((state) => ({
      items: insertTrackNext(state.items, state.currentIndex, track),
      history: state.currentIndex < 0 ? [] : [state.currentIndex],
      visited: state.currentIndex < 0 ? [] : [state.currentIndex],
    })),

  remove: (index) =>
    set((state) => {
      const next = removeQueueItem(state.items, state.currentIndex, index)
      return {
        ...next,
        history: next.currentIndex < 0 ? [] : [next.currentIndex],
        visited: next.currentIndex < 0 ? [] : [next.currentIndex],
      }
    }),

  move: (from, to) =>
    set((state) => {
      const currentIndex = moveQueueCursor(state.currentIndex, from, to)
      return {
        items: moveQueueItem(state.items, from, to),
        currentIndex,
        history: currentIndex < 0 ? [] : [currentIndex],
        visited: currentIndex < 0 ? [] : [currentIndex],
      }
    }),

  clear: () => set({ items: [], currentIndex: -1, history: [], visited: [] }),

  advance: ({ shuffle = false, repeatMode = 'off' } = {}) => {
    const state = get()
    if (state.items.length === 0) return null

    let nextIndex: number
    if (shuffle) {
      let candidates = state.items
        .map((_, index) => index)
        .filter((index) => index !== state.currentIndex && !state.visited.includes(index))
      if (!candidates.length && repeatMode === 'all') {
        candidates = state.items
          .map((_, index) => index)
          .filter((index) => index !== state.currentIndex)
      }
      if (!candidates.length) return null
      nextIndex = candidates[Math.floor(Math.random() * candidates.length)]
    } else {
      nextIndex = state.currentIndex + 1
      if (nextIndex >= state.items.length) {
        if (repeatMode !== 'all') return null
        nextIndex = 0
      }
    }

    set({
      currentIndex: nextIndex,
      history: [...state.history, nextIndex],
      visited: shuffle && state.visited.length === state.items.length
        ? [state.currentIndex, nextIndex].filter((index) => index >= 0)
        : [...state.visited, nextIndex].filter((index, position, items) => items.indexOf(index) === position),
    })
    return state.items[nextIndex]
  },

  previous: ({ shuffle = false, repeatMode = 'off' } = {}) => {
    const state = get()
    if (!state.items.length) return null

    let previousIndex = state.currentIndex - 1
    let history = state.history
    if (shuffle) {
      if (history.length < 2) return null
      history = history.slice(0, -1)
      previousIndex = history[history.length - 1]
    } else if (previousIndex < 0) {
      if (repeatMode !== 'all') return null
      previousIndex = state.items.length - 1
    }

    set({
      currentIndex: previousIndex,
      history: shuffle ? history : [...history, previousIndex],
      visited: state.visited,
    })
    return state.items[previousIndex]
  },
}))
