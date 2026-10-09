import assert from 'node:assert/strict'
import test from 'node:test'
import {
  insertTrackNext,
  insertQueueItem,
  moveQueueCursor,
  moveQueueItem,
  normalizeQueueIndex,
  removeQueueItem,
} from '../src/features/queue/queue.utils.ts'

const a = { id: 'a' }
const b = { id: 'b' }
const c = { id: 'c' }

test('queue index stays in bounds', () => {
  assert.equal(normalizeQueueIndex(0, 0), -1)
  assert.equal(normalizeQueueIndex(3, 90), 2)
  assert.equal(normalizeQueueIndex(3, -2), 0)
})

test('play next preserves existing queue order', () => {
  assert.deepEqual(insertTrackNext([a, c], 0, b), [a, b, c])
  assert.deepEqual(insertTrackNext([a], -1, b), [b, a])
})

test('removing a prior item adjusts the cursor', () => {
  const result = removeQueueItem([a, b, c], 2, 0)
  assert.deepEqual(result.items, [b, c])
  assert.equal(result.currentIndex, 1)
  assert.deepEqual(removeQueueItem([a], 0, 0), { items: [], currentIndex: -1 })
})

test('moving queue entries preserves active item identity', () => {
  const reordered = moveQueueItem([a, b, c], 0, 2)
  assert.deepEqual(reordered, [b, c, a])
  assert.equal(moveQueueCursor(0, 0, 2), 2)
  assert.equal(moveQueueCursor(2, 0, 2), 1)
  assert.equal(moveQueueCursor(1, 2, 0), 2)
})

test('undo and external drops preserve current queue playback identity', () => {
  const result = insertQueueItem([a,b,c],0,{id:'new'},1,[1],[1])
  assert.deepEqual(result.items.map(x=>x.id),['new','a','b','c'])
  assert.equal(result.currentIndex,2)
  assert.deepEqual(result.history,[2])
  assert.deepEqual(result.visited,[2])
  assert.deepEqual(insertQueueItem([a],99,b,0,[0],[0]).items,[a,b])
})
