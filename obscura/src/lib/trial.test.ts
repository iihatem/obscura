import { describe, expect, it } from 'vitest'
import { cardCount } from './trial'

describe('cardCount', () => {
  it('counts each flashcard and each diagram once', () => {
    expect(cardCount([
      { pageIndex: 0, type: 'flashcard', cards: [{ front: 'a', back: 'b' }, { front: 'c', back: 'd' }] },
      { pageIndex: 1, type: 'diagram', labels: [{ label: 'x', x: 0, y: 0, width: 1, height: 1 }] },
      { pageIndex: 2, type: 'flashcard' },
    ])).toBe(3)
  })
})
