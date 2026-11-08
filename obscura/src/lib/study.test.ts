import { describe, expect, it } from 'vitest'
import { aggregateGrades, isShortAnswer, loadTypedAnswers, saveTypedAnswers, swipeGrade, tally, typedAnswerGrade, verdict } from './study'

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

describe('isShortAnswer', () => {
  it('counts answers of six words or fewer as short', () => {
    expect(isShortAnswer('Mitochondria')).toBe(true)
    expect(isShortAnswer('The rough endoplasmic reticulum makes proteins')).toBe(true)
    expect(isShortAnswer('It packages proteins and sends them on to the membrane')).toBe(false)
  })

  it('ignores asides in brackets', () => {
    expect(isShortAnswer('Mitochondria (where most of the cell makes its ATP)')).toBe(true)
  })

  it('treats answers over several lines as long', () => {
    expect(isShortAnswer('Prophase\nMetaphase')).toBe(false)
  })

  it('does not call a blank answer short', () => {
    expect(isShortAnswer('   ')).toBe(false)
  })
})

describe('typedAnswerGrade', () => {
  it('grades short answers with typo tolerance', () => {
    expect(typedAnswerGrade('mitochondria', 'Mitochondria')).toBe('correct')
    expect(typedAnswerGrade('mitocondria', 'Mitochondrion')).toBe('close')
    expect(typedAnswerGrade('ribosome', 'Mitochondria')).toBe('wrong')
  })

  it('accepts the answer without its bracketed aside', () => {
    expect(typedAnswerGrade('mitochondria', 'Mitochondria (the site of respiration)')).toBe('correct')
  })

  it('leaves long answers for the student to grade', () => {
    expect(typedAnswerGrade('it packages proteins', 'It packages proteins and sends them on to the membrane')).toBeNull()
  })

  it('counts nothing typed as Need review, whatever the length', () => {
    expect(typedAnswerGrade('  ', 'Mitochondria')).toBe('wrong')
    expect(typedAnswerGrade('', 'It packages proteins and sends them on to the membrane')).toBe('wrong')
  })
})

describe('typed answers preference', () => {
  it('is off until turned on, and remembered', () => {
    localStorage.clear()
    expect(loadTypedAnswers()).toBe(false)
    saveTypedAnswers(true)
    expect(loadTypedAnswers()).toBe(true)
    saveTypedAnswers(false)
    expect(loadTypedAnswers()).toBe(false)
  })
})
