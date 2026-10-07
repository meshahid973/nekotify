import type { Track } from '@/types/media'

export function normalizeQueueIndex(length: number, index: number) {
  if (length <= 0) {
    return -1
  }

  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

export function insertTrackNext(
  items: Track[],
  currentIndex: number,
  track: Track,
) {
  const insertionIndex =
    currentIndex < 0 ? 0 : Math.min(currentIndex + 1, items.length)
  const next = [...items]
  next.splice(insertionIndex, 0, track)

  return next
}

export function removeQueueItem(
  items: Track[],
  currentIndex: number,
  index: number,
) {
  if (index < 0 || index >= items.length) {
    return { items, currentIndex }
  }

  const next = [...items]
  next.splice(index, 1)

  if (next.length === 0) {
    return { items: next, currentIndex: -1 }
  }

  if (index < currentIndex) {
    return { items: next, currentIndex: currentIndex - 1 }
  }

  if (index === currentIndex) {
    return {
      items: next,
      currentIndex: Math.min(currentIndex, next.length - 1),
    }
  }

  return { items: next, currentIndex }
}

export function moveQueueItem(items: Track[], from: number, to: number) {
  if (
    from < 0 ||
    from >= items.length ||
    to < 0 ||
    to >= items.length ||
    from === to
  ) {
    return items
  }

  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)

  return next
}
