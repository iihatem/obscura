import type { Grade } from './scoring'

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
