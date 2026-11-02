import { describe, expect, it } from 'vitest'
import { aggregateGrades, swipeGrade, tally, verdict } from './study'

describe('aggregateGrades', () => {
  it('is skipped when every label is blank', () => {
    expect(aggregateGrades(['empty', 'empty'])).toBe('empty')
    expect(aggregateGrades([])).toBe('empty')
  })

  it('takes the weakest answered label', () => {
    expect(aggregateGrades(['correct', 'close'])).toBe('close')
    expect(aggregateGrades(['correct', 'wrong', 'close'])).toBe('wrong')
    expect(aggregateGrades(['correct', 'correct'])).toBe('correct')
  })

  it('does not call a diagram correct when some labels were left blank', () => {
    expect(aggregateGrades(['correct', 'empty'])).toBe('wrong')
  })
})

describe('tally', () => {
  it('counts almost as half', () => {
    expect(tally(['correct', 'close', 'wrong', 'empty'])).toEqual({ total: 4, correct: 1, close: 1, missed: 2, pct: 38 })
  })

  it('handles an empty session', () => {
    expect(tally([]).pct).toBe(0)
  })
})

describe('verdict', () => {
  it('matches the score band', () => {
    expect(verdict(95)).toMatch(/well/)
    expect(verdict(20)).toBe('Worth another pass.')
  })
})

describe('swipeGrade', () => {
  it('needs a real swipe, not a nudge', () => {
    expect(swipeGrade(40)).toBeNull()
    expect(swipeGrade(-40)).toBeNull()
    expect(swipeGrade(120)).toBe('correct')
    expect(swipeGrade(-120)).toBe('wrong')
  })
})
