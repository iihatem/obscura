import { beforeEach, describe, expect, it } from 'vitest'
import { clearProgress, loadProgress, saveProgress } from './studyProgress'

const ids = new Set(['a', 'b', 'c'])
const base = { mode: 'flashcard' as const, deck: ['a', 'b', 'c'], answers: [{ cardId: 'a', grade: 'correct' as const, time_taken_ms: 900 }], savedAt: 1000 }

describe('study progress', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips an unfinished session', () => {
    saveProgress('s1', base)
    expect(loadProgress('s1', ids, 2000)?.answers).toHaveLength(1)
  })

  it('drops a session whose cards were deleted since', () => {
    saveProgress('s1', base)
    expect(loadProgress('s1', new Set(['a', 'b']), 2000)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('drops a stale or finished session', () => {
    saveProgress('s1', base)
    expect(loadProgress('s1', ids, base.savedAt + 13 * 3600_000)).toBeNull()
    saveProgress('s1', { ...base, answers: base.deck.map((cardId) => ({ cardId, grade: 'correct' as const, time_taken_ms: 1 })) })
    expect(loadProgress('s1', ids, 2000)).toBeNull()
  })

  it('survives junk in storage', () => {
    localStorage.setItem('obscura:study:s1', '{not json')
    expect(loadProgress('s1', ids)).toBeNull()
    clearProgress('s1')
  })
})
