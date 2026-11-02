import { describe, expect, it } from 'vitest'
import { subjectChips, subjectKey } from './explore'

describe('subjectChips', () => {
  it('merges spellings and labels with the most common one', () => {
    const chips = subjectChips([
      { subject: 'Anatomy' }, { subject: 'ANATOMY' }, { subject: 'Anatomy ' }, { subject: 'histology' }, { subject: null }, { subject: '  ' },
    ])
    expect(chips).toEqual([
      { key: 'anatomy', label: 'Anatomy', count: 3 },
      { key: 'histology', label: 'histology', count: 1 },
    ])
  })

  it('keeps only the most used', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ subject: `S${i}` }))
    expect(subjectChips(many, 5)).toHaveLength(5)
  })
})

describe('subjectKey', () => {
  it('normalizes case and spacing', () => {
    expect(subjectKey('  Heart   Anatomy ')).toBe('heart anatomy')
    expect(subjectKey(null)).toBe('')
  })
})
