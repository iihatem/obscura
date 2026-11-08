import { describe, expect, it } from 'vitest'
import type { Card, DiagramCard, FlashCard } from '@/types'
import {
  availableKinds,
  blankResponse,
  buildChoices,
  buildTest,
  cardsToStudy,
  countOptions,
  defaultCount,
  defaultKinds,
  gradeResponse,
  groupByPage,
  isNearDuplicate,
  missedResults,
  needsSelfGrade,
  resolveCount,
  scoreTest,
  shuffle,
  testPool,
  timerOptions,
  type QuestionResult,
  type TestQuestion,
} from './practiceTest'

/** A repeatable stand-in for Math.random. */
function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const flash = (id: string, back: string, page: number | null = null, front = `Q ${id}`): FlashCard => ({
  id, set_id: 's', position: 0, created_at: '', type: 'flashcard', front, back, image_url: null, labels: null, source_page: page,
})
const diagram = (id: string, labels: string[], page: number | null = null): DiagramCard => ({
  id, set_id: 's', position: 0, created_at: '', type: 'diagram', front: null, back: null, image_url: 'x.png', source_page: page,
  labels: labels.map((label) => ({ label, x: 0, y: 0, width: 10, height: 10 })),
})

const organelles = [
  flash('1', 'Mitochondria'),
  flash('2', 'Ribosome'),
  flash('3', 'Golgi apparatus'),
  flash('4', 'Nucleus'),
  flash('5', 'Lysosome'),
  flash('6', 'Vacuole'),
]

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input, seeded())
    expect(out.sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})

describe('availableKinds and defaultKinds', () => {
  it('offers multiple choice only with four or more flashcards', () => {
    expect(availableKinds(organelles.slice(0, 3)).choice).toBe(false)
    expect(availableKinds(organelles.slice(0, 4)).choice).toBe(true)
  })

  it('ignores diagrams with no labels', () => {
    expect(availableKinds([diagram('d', [])]).diagram).toBe(false)
    expect(availableKinds([diagram('d', ['Aorta'])]).diagram).toBe(true)
  })

  it('turns on typed and diagram questions, not multiple choice', () => {
    expect(defaultKinds([...organelles, diagram('d', ['Aorta'])])).toEqual({ typed: true, diagram: true, choice: false })
    expect(defaultKinds([diagram('d', ['Aorta'])])).toEqual({ typed: false, diagram: true, choice: false })
  })
})

describe('testPool', () => {
  const cards: Card[] = [...organelles, diagram('d1', ['Aorta']), diagram('d2', [])]

  it('draws only the card types that are switched on', () => {
    expect(testPool(cards, { typed: true, diagram: false, choice: false })).toHaveLength(6)
    expect(testPool(cards, { typed: false, diagram: true, choice: false }).map((c) => c.id)).toEqual(['d1'])
    expect(testPool(cards, { typed: false, diagram: false, choice: true })).toHaveLength(6)
    expect(testPool(cards, { typed: true, diagram: true, choice: true })).toHaveLength(7)
  })

  it('ignores multiple choice when the set is too small for it', () => {
    expect(testPool(organelles.slice(0, 2), { typed: false, diagram: false, choice: true })).toHaveLength(0)
  })
})

describe('question counts', () => {
  it('offers 10 and 20 only when the set is bigger', () => {
    expect(countOptions(8)).toEqual(['all'])
    expect(countOptions(15)).toEqual([10, 'all'])
    expect(countOptions(40)).toEqual([10, 20, 'all'])
  })

  it('defaults to 20, or all when there are fewer', () => {
    expect(defaultCount(40)).toBe(20)
    expect(defaultCount(20)).toBe('all')
    expect(defaultCount(7)).toBe('all')
  })

  it('never asks for more questions than there are cards', () => {
    expect(resolveCount(20, 12)).toBe(12)
    expect(resolveCount('all', 12)).toBe(12)
    expect(resolveCount(10, 12)).toBe(10)
  })
})

describe('timerOptions', () => {
  it('scales with the number of questions in 5-minute steps', () => {
    expect(timerOptions(20)).toEqual([10, 20, 30])
    expect(timerOptions(10)).toEqual([5, 10, 15])
  })

  it('never offers less than 5 minutes or the same time twice', () => {
    expect(timerOptions(3)).toEqual([5])
  })
})

describe('isNearDuplicate', () => {
  it('rejects options the grader would accept for the answer', () => {
    expect(isNearDuplicate('Mitochondrion', 'Mitochondria')).toBe(true)
    expect(isNearDuplicate('mitochondria', 'Mitochondria')).toBe(true)
    expect(isNearDuplicate('Bone marrow', 'Red bone marrow')).toBe(true)
    expect(isNearDuplicate('Golgi', 'Golgi apparatus')).toBe(true)
  })

  it('keeps answers that are clearly different', () => {
    expect(isNearDuplicate('Ribosome', 'Mitochondria')).toBe(false)
    expect(isNearDuplicate('Nucleus', 'Golgi apparatus')).toBe(false)
  })
})

describe('buildChoices', () => {
  it('gives four different options with the answer among them', () => {
    const choice = buildChoices(organelles[0], organelles, seeded())!
    expect(choice.options).toHaveLength(4)
    expect(new Set(choice.options).size).toBe(4)
    expect(choice.options[choice.answerIndex]).toBe('Mitochondria')
  })

  it('skips other cards whose answer would grade as right or close', () => {
    const cards = [
      flash('a', 'Mitochondria'),
      flash('b', 'Mitochondrion'),
      flash('c', 'mitochondria'),
      flash('d', 'Ribosome'),
      flash('e', 'Nucleus'),
      flash('f', 'Lysosome'),
    ]
    for (let seed = 1; seed < 20; seed++) {
      const { options } = buildChoices(cards[0], cards, seeded(seed))!
      expect(options.filter((o) => /mitochondri/i.test(o))).toEqual(['Mitochondria'])
    }
  })

  it('does not offer two options that are near-copies of each other', () => {
    const cards = [
      flash('a', 'Nucleus'),
      flash('b', 'Ribosome'),
      flash('c', 'Ribosomes'),
      flash('d', 'Lysosome'),
      flash('e', 'Vacuole'),
    ]
    for (let seed = 1; seed < 20; seed++) {
      const { options } = buildChoices(cards[0], cards, seeded(seed))!
      expect(options.filter((o) => /^ribosome/i.test(o)).length).toBeLessThanOrEqual(1)
    }
  })

  it('returns null when there are not three fair wrong answers', () => {
    const cards = [flash('a', 'Mitochondria'), flash('b', 'Mitochondrion'), flash('c', 'Ribosome'), flash('d', 'Nucleus')]
    expect(buildChoices(cards[0], cards, seeded())).toBeNull()
  })

  it('prefers wrong answers of a similar length to the right one', () => {
    const long = 'The movement of water across a semipermeable membrane'
    const cards = [
      flash('a', long),
      flash('b', 'The breakdown of glucose into pyruvate in the cytoplasm'),
      flash('c', 'The copying of DNA into messenger RNA inside the nucleus'),
      flash('d', 'The release of energy stored in ATP molecules in cells'),
      flash('e', 'ATP'),
      flash('f', 'Cell'),
      flash('g', 'DNA'),
    ]
    const { options } = buildChoices(cards[0], cards, seeded())!
    expect(options.every((o) => o.length > 20)).toBe(true)
  })
})

describe('buildTest', () => {
  const big: Card[] = [
    ...['Mitochondria', 'Ribosome', 'Nucleus', 'Lysosome', 'Vacuole', 'Chloroplast', 'Cytoplasm', 'Centriole',
      'Peroxisome', 'Cilia', 'Flagellum', 'Cell wall', 'Plasma membrane', 'Golgi apparatus', 'Endoplasmic reticulum', 'Nucleolus',
      'Chromatin', 'Microtubule', 'Vesicle', 'Cytoskeleton', 'Thylakoid', 'Stroma', 'Glycogen', 'Enzyme'].map((back, i) => flash(`f${i}`, back)),
    diagram('d1', ['Aorta', 'Vena cava']),
    diagram('d2', ['Femur']),
    diagram('empty', []),
  ]

  it('asks the chosen number of questions, each card once', () => {
    const test = buildTest(big, { count: 20, kinds: { typed: true, diagram: true, choice: false } }, seeded())
    expect(test).toHaveLength(20)
    expect(new Set(test.map((q) => q.card.id)).size).toBe(20)
    expect(test.some((q) => q.card.id === 'empty')).toBe(false)
  })

  it('uses every eligible card for "all"', () => {
    const test = buildTest(big, { count: 'all', kinds: { typed: true, diagram: true, choice: false } }, seeded())
    expect(test).toHaveLength(26)
  })

  it('makes only typed and diagram questions by default', () => {
    const test = buildTest(big, { count: 'all', kinds: defaultKinds(big) }, seeded())
    expect(new Set(test.map((q) => q.kind))).toEqual(new Set(['typed', 'diagram']))
  })

  it('keeps typed questions the majority when multiple choice is on too', () => {
    const test = buildTest(big, { count: 'all', kinds: { typed: true, diagram: false, choice: true } }, seeded())
    const choice = test.filter((q) => q.kind === 'choice').length
    expect(choice).toBe(8)
    expect(test.filter((q) => q.kind === 'typed').length).toBe(16)
  })

  it('spreads multiple choice through the test instead of putting it first', () => {
    const kinds = { typed: true, diagram: false, choice: true }
    const firstChoice = Array.from({ length: 10 }, (_, s) =>
      buildTest(big, { count: 'all', kinds }, seeded(s + 1)).findIndex((q) => q.kind === 'choice')
    )
    expect(firstChoice.some((i) => i > 0)).toBe(true)
    const lastChoice = buildTest(big, { count: 'all', kinds }, seeded(3)).map((q) => q.kind).lastIndexOf('choice')
    expect(lastChoice).toBeGreaterThan(8)
  })

  it('makes every flashcard multiple choice when that is the only type', () => {
    const test = buildTest(big, { count: 10, kinds: { typed: false, diagram: false, choice: true } }, seeded())
    expect(test.every((q) => q.kind === 'choice')).toBe(true)
  })

  it('asks a typed question when a card cannot get fair options', () => {
    const cards = [flash('a', 'Mitochondria'), flash('b', 'Mitochondrion'), flash('c', 'Mitochondrial'), flash('d', 'Mitochondrias')]
    const test = buildTest(cards, { count: 'all', kinds: { typed: false, diagram: false, choice: true } }, seeded())
    expect(test.every((q) => q.kind === 'typed')).toBe(true)
  })

  it('only makes diagram questions when only diagrams are on', () => {
    const test = buildTest(big, { count: 'all', kinds: { typed: false, diagram: true, choice: false } }, seeded())
    expect(test.map((q) => q.card.id).sort()).toEqual(['d1', 'd2'])
  })
})

describe('gradeResponse', () => {
  const typed: TestQuestion = { kind: 'typed', card: flash('a', 'Mitochondria') }
  const long: TestQuestion = { kind: 'typed', card: flash('b', 'It makes energy for the cell by breaking down glucose in respiration') }
  const choice: TestQuestion = { kind: 'choice', card: flash('c', 'Ribosome'), options: ['Nucleus', 'Ribosome', 'Vacuole', 'Lysosome'], answerIndex: 1 }
  const diag: TestQuestion = { kind: 'diagram', card: diagram('d', ['Aorta', 'Left ventricle', 'Femur']) }

  it('grades short typed answers with typo tolerance', () => {
    expect(gradeResponse(typed, { kind: 'typed', text: 'mitochondria' }).grade).toBe('correct')
    expect(gradeResponse(typed, { kind: 'typed', text: 'mitocondrea' }).grade).toBe('close')
    expect(gradeResponse(typed, { kind: 'typed', text: 'ribosome' }).grade).toBe('wrong')
    expect(gradeResponse(typed, { kind: 'typed', text: '  ' }).grade).toBe('empty')
  })

  it('leaves long answers for the student to grade, unless left blank', () => {
    expect(gradeResponse(long, { kind: 'typed', text: 'energy' }).grade).toBeNull()
    expect(gradeResponse(long, { kind: 'typed', text: '' }).grade).toBe('empty')
  })

  it('grades multiple choice by the option picked', () => {
    expect(gradeResponse(choice, { kind: 'choice', chosen: 1 }).grade).toBe('correct')
    expect(gradeResponse(choice, { kind: 'choice', chosen: 0 }).grade).toBe('wrong')
    expect(gradeResponse(choice, { kind: 'choice', chosen: null }).grade).toBe('empty')
  })

  it('grades each diagram label', () => {
    const r = gradeResponse(diag, { kind: 'diagram', labels: ['aorta', 'left ventricel', ''] })
    expect(r.labelGrades).toEqual(['correct', 'close', 'empty'])
    expect(r.grade).toBe('wrong')
  })

  it('refuses an answer of the wrong kind', () => {
    expect(() => gradeResponse(typed, { kind: 'choice', chosen: 0 })).toThrow()
  })

  it('treats a blank response as unanswered', () => {
    expect(gradeResponse(typed, blankResponse(typed)).grade).toBe('empty')
    expect(gradeResponse(choice, blankResponse(choice)).grade).toBe('empty')
    expect(gradeResponse(diag, blankResponse(diag)).labelGrades).toEqual(['empty', 'empty', 'empty'])
  })
})

/** A result with a set grade, for scoring tests. */
function result(card: Card, grade: QuestionResult['grade'], labelGrades?: QuestionResult['labelGrades']): QuestionResult {
  if (card.type === 'diagram') {
    return { question: { kind: 'diagram', card }, response: { kind: 'diagram', labels: card.labels.map(() => '') }, grade, labelGrades }
  }
  return { question: { kind: 'typed', card }, response: { kind: 'typed', text: '' }, grade }
}

describe('scoreTest', () => {
  it('counts a question as one point and each diagram label as one point', () => {
    const t = scoreTest([
      result(flash('a', 'x'), 'correct'),
      result(flash('b', 'y'), 'wrong'),
      result(diagram('d', ['p', 'q', 'r', 's']), 'wrong', ['correct', 'correct', 'close', 'empty']),
    ])
    expect(t).toEqual({ total: 6, correct: 3, close: 1, missed: 2, pct: 58 })
  })

  it('counts an ungraded long answer as missed', () => {
    expect(scoreTest([result(flash('a', 'x'), null)]).missed).toBe(1)
  })
})

describe('needsSelfGrade', () => {
  it('lists the results with no grade yet', () => {
    expect(needsSelfGrade([result(flash('a', 'x'), 'correct'), result(flash('b', 'y'), null)])).toEqual([1])
  })
})

describe('groupByPage', () => {
  it('pools neighbouring pages into ranges of a few points', () => {
    const results = [
      result(flash('a', 'x', 12), 'correct'),
      result(flash('b', 'x', 13), 'wrong'),
      result(flash('c', 'x', 14), 'correct'),
      result(flash('d', 'x', 20), 'wrong'),
      result(flash('e', 'x', 21), 'wrong'),
      result(flash('f', 'x', 22), 'close'),
    ]
    expect(groupByPage(results)).toEqual([
      { label: 'p. 12–14', correct: 2, close: 0, total: 3 },
      { label: 'p. 20–22', correct: 0, close: 1, total: 3 },
    ])
  })

  it('labels a single page without a range', () => {
    const results = [12, 12, 12, 30, 30, 30].map((p, i) => result(flash(`${i}`, 'x', p), 'correct'))
    expect(groupByPage(results).map((g) => g.label)).toEqual(['p. 12', 'p. 30'])
  })

  it('folds a small leftover into the range before it', () => {
    const results = [1, 2, 3, 4].map((p, i) => result(flash(`${i}`, 'x', p), 'correct'))
    expect(groupByPage(results).map((g) => g.label)).toEqual(['p. 1–4'])
  })

  it('splits long lectures into no more than about six ranges', () => {
    const results = Array.from({ length: 60 }, (_, i) => result(flash(`${i}`, 'x', i + 1), 'correct'))
    const groups = groupByPage(results)
    expect(groups.length).toBeLessThanOrEqual(6)
    expect(groups.reduce((n, g) => n + g.total, 0)).toBe(60)
  })

  it('counts a diagram label by label under its page', () => {
    const groups = groupByPage([
      result(diagram('d', ['a', 'b', 'c'], 5), 'wrong', ['correct', 'wrong', 'close']),
      result(flash('a', 'x'), 'correct'),
    ])
    expect(groups).toEqual([
      { label: 'p. 5', correct: 1, close: 1, total: 3 },
      { label: 'Other flashcards', correct: 1, close: 0, total: 1 },
    ])
  })

  it('groups by card type when no card has a page', () => {
    const groups = groupByPage([
      result(flash('a', 'x'), 'correct'),
      result(flash('b', 'y'), 'wrong'),
      result(diagram('d', ['p', 'q']), 'close', ['correct', 'close']),
    ])
    expect(groups).toEqual([
      { label: 'Flashcards', correct: 1, close: 0, total: 2 },
      { label: 'Diagram labels', correct: 1, close: 1, total: 2 },
    ])
  })
})

describe('missed cards', () => {
  const a = flash('a', 'x')
  const b = flash('b', 'y')
  const c = flash('c', 'z')
  const results = [result(a, 'correct'), result(b, 'close'), result(c, 'empty')]

  it('lists everything not fully right, almost included', () => {
    expect(missedResults(results).map((r) => r.question.card.id)).toEqual(['b', 'c'])
  })

  it('gives each card to study once', () => {
    expect(cardsToStudy([...results, result(c, 'wrong')]).map((card) => card.id)).toEqual(['b', 'c'])
  })
})
