import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanHeroTitle } from '../src/features/library/cleanHeroTitle.ts'

test('removes trailing slowed/reverb tags without editing real metadata', () => {
  assert.equal(cleanHeroTitle('Loose (Ultra slowed + Reverb)'), 'Loose')
  assert.equal(cleanHeroTitle('Telephones [Slowed & Reverb]'), 'Telephones')
  assert.equal(cleanHeroTitle('Song — Extended Version'), 'Song')
  assert.equal(cleanHeroTitle('Track - Sped up'), 'Track')
})

test('preserves meaningful titles and handles edge cases', () => {
  assert.equal(cleanHeroTitle('Slowdive'), 'Slowdive')
  assert.equal(cleanHeroTitle('The Extended Play'), 'The Extended Play')
  assert.equal(cleanHeroTitle('Reverb'), 'Reverb')
  assert.equal(cleanHeroTitle(''), '')
})
