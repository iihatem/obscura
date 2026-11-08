import { describe, expect, it } from 'vitest'
import { gradeAnswer, namesPartOf } from './scoring'

describe('gradeAnswer', () => {
  it('accepts exact answers and tiny slips', () => {
    expect(gradeAnswer('Nucleus', 'Nucleus')).toBe('correct')
    expect(gradeAnswer('nucleas', 'Nucleus')).toBe('correct')
    expect(gradeAnswer('  golgi   apparatus ', 'Golgi apparatus')).toBe('correct')
  })

  it('ignores a leading article', () => {
    expect(gradeAnswer('the nucleus', 'Nucleus')).toBe('correct')
    expect(gradeAnswer('Nucleus', 'The nucleus')).toBe('correct')
  })

  it('treats spelling that is close but not right as almost', () => {
    expect(gradeAnswer('mitocondria', 'Mitochondrion')).toBe('close')
  })

  it('gives credit for naming most of a longer label', () => {
    expect(gradeAnswer('bone marow', 'RED BONE MARROW')).toBe('close')
    expect(gradeAnswer('lymphoid stem cell', 'Lymphoid stem cells')).toBe('correct')
    expect(gradeAnswer('stem cells', 'Lymphoid stem cells')).toBe('close')
  })

  it('does not reward a single generic word from a long label', () => {
    expect(gradeAnswer('cells', 'Lymphoid stem cells')).toBe('wrong')
    expect(gradeAnswer('the', 'The thymus')).toBe('wrong')
  })

  it('marks a different structure wrong', () => {
    expect(gradeAnswer('ribosome', 'Nucleus')).toBe('wrong')
    expect(gradeAnswer('thymus', 'Spleen')).toBe('wrong')
  })

  it('does not reward padding the right answer with extra words', () => {
    expect(gradeAnswer('nucleus or mitochondrion or ribosome', 'Nucleus')).toBe('wrong')
  })

  it('handles empty input', () => {
    expect(gradeAnswer('   ', 'Nucleus')).toBe('empty')
  })
})

describe('namesPartOf', () => {
  it('is true when every word typed is in the answer', () => {
    expect(namesPartOf('surgical', 'Surgical intervention')).toBe(true)
    expect(namesPartOf('infection and atelectasis', 'Increased atelectasis and infection')).toBe(true)
    expect(namesPartOf('surgicle', 'Surgical intervention')).toBe(true)
  })

  it('is false for a word not in the answer, or nothing but filler', () => {
    expect(namesPartOf('surgical drugs', 'Surgical intervention')).toBe(false)
    expect(namesPartOf('the', 'Surgical intervention')).toBe(false)
  })
})
