import { describe, expect, it } from 'vitest'
import { filterAndSort, relativeDate, statsBySet } from './library'

describe('statsBySet', () => {
  it('keeps the latest finished session per set', () => {
    const stats = statsBySet([
      { set_id: 'a', completed_at: '2026-10-01T10:00:00Z', card_results: [{ grade: 'wrong' }] },
      { set_id: 'a', completed_at: '2026-10-05T10:00:00Z', card_results: [{ grade: 'correct' }, { grade: 'close' }] },
      { set_id: 'b', completed_at: null, card_results: [{ grade: 'correct' }] },
      { set_id: 'c', completed_at: '2026-10-06T10:00:00Z', card_results: [] },
    ])
    expect(stats.get('a')).toEqual({ lastStudiedAt: '2026-10-05T10:00:00Z', lastScore: 75 })
    expect(stats.has('b')).toBe(false)
    expect(stats.has('c')).toBe(false)
  })
})

describe('relativeDate', () => {
  const now = new Date('2026-11-02T12:00:00Z').getTime()
  it('reads naturally', () => {
    expect(relativeDate('2026-11-02T08:00:00Z', now)).toBe('today')
    expect(relativeDate('2026-11-01T08:00:00Z', now)).toBe('yesterday')
    expect(relativeDate('2026-10-29T08:00:00Z', now)).toBe('4 days ago')
    expect(relativeDate('2026-10-20T08:00:00Z', now)).toBe('last week')
    expect(relativeDate('2026-08-01T08:00:00Z', now)).toBe('3 months ago')
  })

  it('never says a future date is in the past', () => {
    expect(relativeDate('2026-11-05T08:00:00Z', now)).toBe('today')
  })
})

describe('filterAndSort', () => {
  const sets = [
    { title: 'Lecture 10', subject: 'BIO', updated_at: '2026-10-01' },
    { title: 'lecture 2', subject: null, updated_at: '2026-10-03' },
    { title: 'Alkenes', subject: 'CHEM 231', updated_at: '2026-10-02' },
  ]

  it('sorts titles naturally and case-insensitively', () => {
    expect(filterAndSort(sets, '', 'title').map((s) => s.title)).toEqual(['Alkenes', 'lecture 2', 'Lecture 10'])
  })

  it('filters by title or subject', () => {
    expect(filterAndSort(sets, 'chem', 'recent').map((s) => s.title)).toEqual(['Alkenes'])
  })

  it('puts the most recently edited first', () => {
    expect(filterAndSort(sets, '', 'recent')[0].title).toBe('lecture 2')
  })
})
