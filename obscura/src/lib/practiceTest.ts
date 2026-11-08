import type { Card, DiagramCard, FlashCard } from '@/types'
import { gradeAnswer, type Grade } from './scoring'
import { aggregateGrades, tally, typedAnswerGrade, type Tally } from './study'

/**
 * Practice tests: questions drawn from a set, answered with no feedback, and
 * scored at the end. Typed recall is the default; multiple choice is optional
 * and always shows the right answer afterwards.
 */

export type QuestionKind = 'typed' | 'diagram' | 'choice'
export type KindSet = Record<QuestionKind, boolean>
export type QuestionCount = 10 | 20 | 'all'

export type TestQuestion =
  | { kind: 'typed'; card: FlashCard }
  | { kind: 'choice'; card: FlashCard; options: string[]; answerIndex: number }
  | { kind: 'diagram'; card: DiagramCard }

export type TestResponse =
  | { kind: 'typed'; text: string }
  | { kind: 'choice'; chosen: number | null }
  | { kind: 'diagram'; labels: string[] }

export interface QuestionResult {
  question: TestQuestion
  response: TestResponse
  /** Null for a long typed answer the student still has to grade themselves. */
  grade: Grade | null
  /** One grade per label, for diagrams. */
  labelGrades?: Grade[]
}

export type Rng = () => number

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const isFlash = (c: Card): c is FlashCard => c.type === 'flashcard'
/** A diagram with nothing covered has nothing to ask. */
const isTestableDiagram = (c: Card): c is DiagramCard => c.type === 'diagram' && c.labels.length > 0

/** Multiple choice needs the right answer and three others from the same set. */
export const MIN_CHOICE_CARDS = 4

/** Which question types this set can make. */
export function availableKinds(cards: readonly Card[]): KindSet {
  const flash = cards.filter(isFlash).length
  return {
    typed: flash > 0,
    diagram: cards.some(isTestableDiagram),
    choice: flash >= MIN_CHOICE_CARDS,
  }
}

/** Typed and diagram questions are on by default; multiple choice is opt-in. */
export function defaultKinds(cards: readonly Card[]): KindSet {
  const can = availableKinds(cards)
  return { typed: can.typed, diagram: can.diagram, choice: false }
}

/** The cards a test with these question types can draw from. */
export function testPool(cards: readonly Card[], kinds: KindSet): Card[] {
  const can = availableKinds(cards)
  const flash = (kinds.typed && can.typed) || (kinds.choice && can.choice)
  return cards.filter((c) => (flash && isFlash(c)) || (kinds.diagram && isTestableDiagram(c)))
}

/** 10 and 20 only when the pool is bigger than that; "all" always. */
export function countOptions(poolSize: number): QuestionCount[] {
  const opts: QuestionCount[] = []
  if (poolSize > 10) opts.push(10)
  if (poolSize > 20) opts.push(20)
  opts.push('all')
  return opts
}

export function defaultCount(poolSize: number): QuestionCount {
  return poolSize > 20 ? 20 : 'all'
}

export function resolveCount(count: QuestionCount, poolSize: number): number {
  return count === 'all' ? poolSize : Math.min(count, poolSize)
}

/** About 30 s, 1 min and 90 s a question, in whole 5-minute steps. */
export function timerOptions(questions: number): number[] {
  const mins = [0.5, 1, 1.5].map((per) => Math.max(5, Math.ceil((questions * per) / 5) * 5))
  return [...new Set(mins)]
}

const counts = (g: Grade | null | undefined) => g === 'correct' || g === 'close'

/**
 * Whether a wrong option would really be right, or nearly: the grader accepts
 * it for the answer, or the answer for it. Such options make a question unfair.
 */
export function isNearDuplicate(option: string, answer: string): boolean {
  const a = option.trim().toLowerCase()
  const b = answer.trim().toLowerCase()
  if (!a || !b || a === b) return true
  return counts(gradeAnswer(option, answer)) || counts(gradeAnswer(answer, option)) || counts(typedAnswerGrade(option, answer))
}

/** How different two answers are in length, coarsely, so a long right answer doesn't stand out. */
function lengthGap(a: string, b: string): number {
  return Math.round(Math.abs(Math.log((a.length + 1) / (b.length + 1))) * 4)
}

/**
 * Four options: the card's answer and three others from the same set, closest
 * in length first. Null when the set doesn't have three answers that are
 * clearly different from this one and from each other.
 */
export function buildChoices(
  card: FlashCard,
  flashcards: readonly FlashCard[],
  rng: Rng = Math.random
): { options: string[]; answerIndex: number } | null {
  const answer = card.back.trim()
  const seen = new Set<string>([answer.toLowerCase()])
  const candidates: string[] = []
  for (const c of flashcards) {
    const text = c.back.trim()
    const key = text.toLowerCase()
    if (c.id === card.id || !text || seen.has(key)) continue
    seen.add(key)
    candidates.push(text)
  }
  // Shuffle first so the sort keeps answers of a similar length in random order.
  const ranked = shuffle(candidates, rng).sort((x, y) => lengthGap(x, answer) - lengthGap(y, answer))

  const picked: string[] = []
  for (const option of ranked) {
    if (isNearDuplicate(option, answer)) continue
    if (picked.some((p) => isNearDuplicate(option, p))) continue
    picked.push(option)
    if (picked.length === 3) break
  }
  if (picked.length < 3) return null

  const options = shuffle([answer, ...picked], rng)
  return { options, answerIndex: options.indexOf(answer) }
}

export interface TestSettings {
  count: QuestionCount
  kinds: KindSet
}

/**
 * Pick the questions. Cards come in random order; when typed and multiple
 * choice are both on, about a third of the flashcards become multiple choice
 * and the rest stay typed, since recall is the better practice. A flashcard
 * that can't get fair options is asked as a typed question instead.
 */
export function buildTest(cards: readonly Card[], settings: TestSettings, rng: Rng = Math.random): TestQuestion[] {
  const pool = testPool(cards, settings.kinds)
  const picked = shuffle(pool, rng).slice(0, resolveCount(settings.count, pool.length))
  const allFlash = cards.filter(isFlash)
  const can = availableKinds(cards)
  const choiceOn = settings.kinds.choice && can.choice
  const typedOn = settings.kinds.typed && can.typed

  const flashAt = picked.flatMap((c, i) => (isFlash(c) ? [i] : []))
  const choiceSlots = !choiceOn ? 0 : typedOn ? Math.round(flashAt.length / 3) : flashAt.length
  // Try the flashcards in a fresh random order, so multiple choice is spread
  // through the test instead of bunched at the start.
  const choices = new Map<number, { options: string[]; answerIndex: number }>()
  for (const i of shuffle(flashAt, rng)) {
    if (choices.size >= choiceSlots) break
    const built = buildChoices(picked[i] as FlashCard, allFlash, rng)
    if (built) choices.set(i, built)
  }

  return picked.map((card, i): TestQuestion => {
    if (card.type === 'diagram') return { kind: 'diagram', card }
    const built = choices.get(i)
    return built ? { kind: 'choice', card, ...built } : { kind: 'typed', card }
  })
}

/** What an unanswered question looks like, for when time runs out. */
export function blankResponse(q: TestQuestion): TestResponse {
  if (q.kind === 'typed') return { kind: 'typed', text: '' }
  if (q.kind === 'choice') return { kind: 'choice', chosen: null }
  return { kind: 'diagram', labels: q.card.labels.map(() => '') }
}

/**
 * Grade one answer. Short typed answers are checked like typed study answers;
 * long ones come back null for the student to grade against the real answer.
 */
export function gradeResponse(question: TestQuestion, response: TestResponse): QuestionResult {
  if (question.kind === 'typed' && response.kind === 'typed') {
    const grade = response.text.trim() ? typedAnswerGrade(response.text, question.card.back) : 'empty'
    return { question, response, grade }
  }
  if (question.kind === 'choice' && response.kind === 'choice') {
    const grade: Grade = response.chosen === null ? 'empty' : response.chosen === question.answerIndex ? 'correct' : 'wrong'
    return { question, response, grade }
  }
  if (question.kind === 'diagram' && response.kind === 'diagram') {
    const labelGrades = question.card.labels.map((l, i) => gradeAnswer(response.labels[i] ?? '', l.label))
    return { question, response, grade: aggregateGrades(labelGrades), labelGrades }
  }
  throw new Error(`A ${response.kind} answer can't answer a ${question.kind} question`)
}

/** Long typed answers the student still has to grade. */
export function needsSelfGrade(results: readonly QuestionResult[]): number[] {
  return results.flatMap((r, i) => (r.grade === null ? [i] : []))
}

/**
 * The points a result is worth: one per question, or one per label for a
 * diagram, so a ten-label diagram counts as much as ten questions.
 */
export function unitGrades(r: QuestionResult): Grade[] {
  if (r.question.kind === 'diagram') return r.labelGrades ?? r.question.card.labels.map(() => 'empty')
  return [r.grade ?? 'empty']
}

export function scoreTest(results: readonly QuestionResult[]): Tally {
  return tally(results.flatMap(unitGrades))
}

export interface ScoreGroup {
  label: string
  correct: number
  close: number
  total: number
}

function addUnits(group: ScoreGroup, grades: Grade[]) {
  group.total += grades.length
  group.correct += grades.filter((g) => g === 'correct').length
  group.close += grades.filter((g) => g === 'close').length
}

/**
 * How the score splits across the lecture. Pages next to each other are
 * pooled into ranges of a few points each ("p. 12–14"), so a long lecture
 * doesn't become a list of single questions. Cards with no page are grouped
 * by type. With no pages at all, the whole test is grouped by type.
 */
export function groupByPage(results: readonly QuestionResult[]): ScoreGroup[] {
  const byPage = new Map<number, Grade[]>()
  const unpaged: { flash: Grade[]; diagram: Grade[] } = { flash: [], diagram: [] }
  for (const r of results) {
    const page = r.question.card.source_page
    const grades = unitGrades(r)
    if (page) byPage.set(page, [...(byPage.get(page) ?? []), ...grades])
    else unpaged[r.question.kind === 'diagram' ? 'diagram' : 'flash'].push(...grades)
  }

  const groups: ScoreGroup[] = []
  const pages = [...byPage.keys()].sort((a, b) => a - b)
  if (pages.length) {
    const totalUnits = pages.reduce((n, p) => n + byPage.get(p)!.length, 0)
    const target = Math.max(3, Math.ceil(totalUnits / 6))
    const ranges: { first: number; last: number; grades: Grade[] }[] = []
    let current: { first: number; last: number; grades: Grade[] } | null = null
    for (const p of pages) {
      if (!current) current = { first: p, last: p, grades: [] }
      current.last = p
      current.grades.push(...byPage.get(p)!)
      if (current.grades.length >= target) {
        ranges.push(current)
        current = null
      }
    }
    if (current) {
      // A small leftover joins the range before it.
      const prev = ranges[ranges.length - 1]
      if (prev && current.grades.length < target / 2) {
        prev.last = current.last
        prev.grades.push(...current.grades)
      } else {
        ranges.push(current)
      }
    }
    for (const r of ranges) {
      const g: ScoreGroup = { label: r.first === r.last ? `p. ${r.first}` : `p. ${r.first}–${r.last}`, correct: 0, close: 0, total: 0 }
      addUnits(g, r.grades)
      groups.push(g)
    }
  }

  if (unpaged.flash.length) {
    const g: ScoreGroup = { label: pages.length ? 'Other flashcards' : 'Flashcards', correct: 0, close: 0, total: 0 }
    addUnits(g, unpaged.flash)
    groups.push(g)
  }
  if (unpaged.diagram.length) {
    const g: ScoreGroup = { label: pages.length ? 'Other diagram labels' : 'Diagram labels', correct: 0, close: 0, total: 0 }
    addUnits(g, unpaged.diagram)
    groups.push(g)
  }
  return groups
}

/** Results that weren't fully right: wrong, skipped, or almost. */
export function missedResults(results: readonly QuestionResult[]): QuestionResult[] {
  return results.filter((r) => r.grade !== 'correct')
}

/** The cards to study after the test, each once. */
export function cardsToStudy(results: readonly QuestionResult[]): Card[] {
  const seen = new Set<string>()
  const out: Card[] = []
  for (const r of missedResults(results)) {
    if (seen.has(r.question.card.id)) continue
    seen.add(r.question.card.id)
    out.push(r.question.card)
  }
  return out
}
