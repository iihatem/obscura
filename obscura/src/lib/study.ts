import { gradeAnswer, namesPartOf, type Grade } from './scoring'

/** A diagram is as good as its weakest label; all blank means skipped. */
export function aggregateGrades(grades: Grade[]): Grade {
  if (!grades.length || grades.every((g) => g === 'empty')) return 'empty'
  const answered = grades.filter((g) => g !== 'empty')
  if (answered.some((g) => g === 'wrong') || answered.length < grades.length) return 'wrong'
  if (answered.some((g) => g === 'close')) return 'close'
  return 'correct'
}

export interface Tally {
  total: number
  correct: number
  close: number
  missed: number
  /** Almost counts half, like the history page has always scored it. */
  pct: number
}

export function tally(grades: Grade[]): Tally {
  const total = grades.length
  const correct = grades.filter((g) => g === 'correct').length
  const close = grades.filter((g) => g === 'close').length
  const missed = total - correct - close
  const pct = total ? Math.round(((correct + close * 0.5) / total) * 100) : 0
  return { total, correct, close, missed, pct }
}

/** One plain sentence on how it went, never cheerleading. */
export function verdict(pct: number): string {
  if (pct >= 90) return 'You know this set well.'
  if (pct >= 70) return 'Strong session. A few to go back to.'
  if (pct >= 40) return 'Getting there. Another pass will help.'
  return 'Worth another pass.'
}

export const SWIPE_THRESHOLD = 90

/** Right swipe is Confident, left is Need review; anything shorter snaps back. */
export function swipeGrade(dx: number): Grade | null {
  if (dx >= SWIPE_THRESHOLD) return 'correct'
  if (dx <= -SWIPE_THRESHOLD) return 'wrong'
  return null
}

/** Answers this many words or fewer are graded for the student; longer ones they grade themselves. */
export const SHORT_ANSWER_WORDS = 6

/** The answer without any "(…)" asides, which students rarely type. */
function coreAnswer(answer: string): string {
  const core = answer.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  return core || answer.trim()
}

/** A one-line answer of a few words, short enough to check a typed reply against. */
export function isShortAnswer(answer: string): boolean {
  const core = coreAnswer(answer)
  if (!core || /\n/.test(answer.trim())) return false
  return core.split(' ').length <= SHORT_ANSWER_WORDS
}

const rank: Record<Grade, number> = { correct: 3, close: 2, wrong: 1, empty: 0 }

/**
 * The suggested grade for a typed flashcard answer, or null when the answer is
 * too long to check and the student should compare and grade it themselves.
 * Nothing typed is always Need review.
 */
export function typedAnswerGrade(typed: string, answer: string): Grade | null {
  if (!typed.trim()) return 'wrong'
  if (!isShortAnswer(answer)) return null
  const forms = [answer, coreAnswer(answer)]
  const best = forms.map((a) => gradeAnswer(typed, a)).reduce((a, b) => (rank[b] > rank[a] ? b : a))
  if (best === 'correct' || best === 'close') return best
  // Naming part of the answer, and nothing that isn't in it, is Almost.
  return forms.some((a) => namesPartOf(typed, a)) ? 'close' : 'wrong'
}

const TYPED_KEY = 'obscura:typed-answers'

/** Whether this browser studies flashcards by typing the answer first. */
export function loadTypedAnswers(): boolean {
  try { return localStorage.getItem(TYPED_KEY) === '1' } catch { return false }
}

export function saveTypedAnswers(on: boolean) {
  try {
    if (on) localStorage.setItem(TYPED_KEY, '1')
    else localStorage.removeItem(TYPED_KEY)
  } catch {}
}
