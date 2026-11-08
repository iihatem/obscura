import type { Grade } from './scoring'

/**
 * The exam-date review plan: which cards a student should review today so
 * that study is spread out before the exam instead of crammed into the last
 * night. It's computed fresh from the grade history every time, so there's no
 * per-card state to keep in sync.
 *
 * How a day's list is built:
 * - Cards never studied are spread evenly over the first half of the time
 *   between making the plan and the exam (two weeks at most), so every card
 *   is seen well before the exam.
 * - A studied card comes back after a gap set by its last grade: Need review
 *   tomorrow, Almost in 2 days, and Confident in 2, 4, 8… days as it keeps
 *   being recalled. Only a day's first grade counts; a second pass in the same
 *   sitting is short-term memory.
 * - Gaps are capped at about a fifth of the time left until the exam (Cepeda
 *   et al. 2008 found the best gap is 10–20% of the time until the test).
 * - A card is "learned" once it's been Confident on two separate days in a
 *   row; one confident answer isn't enough, because self-grading runs high.
 * - Missed days don't pile up: overdue cards are spread over the next few
 *   days, and a day never holds more than the cap.
 * - The last days before the exam are a light pass over every card not yet
 *   learned: none is left resting past the day before the exam, and they're
 *   spread over the final days. A learned card whose next gap would reach the
 *   exam rests.
 *
 * Days are the student's local calendar days, as YYYY-MM-DD strings.
 */

export interface GradeEvent {
  cardId: string
  grade: Grade
  /** When it was answered, as an ISO timestamp. */
  at: string
}

export interface PlanInput {
  /** The set's cards, in set order. */
  cardIds: string[]
  history: GradeEvent[]
  /** The exam day, YYYY-MM-DD. */
  examDate: string
  /** The student's local date, YYYY-MM-DD. */
  today: string
  /** Most cards to review in one day. */
  cap: number
  /** The day the plan was made, YYYY-MM-DD. New cards are spread out from then. Defaults to today. */
  startDate?: string
  /** The student's time zone, for turning answer times into local days. Defaults to this device's. */
  timeZone?: string
}

export interface UpcomingDay {
  date: string
  count: number
}

export interface DayPlan {
  /** Days until the exam: 1 is tomorrow, 0 is today, below 0 has passed. */
  daysLeft: number
  /** Today's whole list. It stays the same all day, however much is studied. */
  planned: string[]
  /** The cards on today's list not studied yet today, in study order. */
  remaining: string[]
  /** How many of today's cards have been studied today. */
  doneToday: number
  total: number
  /** Cards studied at least once. */
  seen: number
  /** Cards Confident on two separate days in a row. */
  learned: number
  /** About how many cards each coming day holds if the student keeps up, through the exam (a week at most). */
  upcoming: UpcomingDay[]
  /** Cards that, at this cap, won't have been seen even once by the exam. */
  unseenAtExam: number
}

export const DEFAULT_CAP = 30
export const MIN_CAP = 5
export const MAX_CAP = 200

/** The longest gap is this share of the days left until the exam (Cepeda et al. 2008: 10–20%). */
const GAP_RATIO = 0.2
/** New cards are spread over half the plan's length, and at most this many days. */
const MAX_NEW_WINDOW = 14
/** Overdue cards are spread over about this many days, */
const CATCH_UP_DAYS = 3
/** with at least this share of the cap going to them each day, so the backlog clears. */
const CATCH_UP_SHARE = 1 / 3
/** The last pass over cards not yet learned starts this many days before the exam. */
const FINAL_DAYS = 2
const UPCOMING_DAYS = 7

type Result = 'wrong' | 'close' | 'correct'

interface CardState {
  firstDay: number | null
  lastDay: number | null
  last: Result | null
  /** Separate days in a row recalled; Almost holds it at one at most. */
  streak: number
  /** The day it's next due, or null when it's new or needs nothing more before the exam. */
  due: number | null
}

// ── Dates ───────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

/** A YYYY-MM-DD date as a whole day count, so dates can be subtracted. */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

export function dateFromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  return dateFromDay(dayNumber(date) + n)
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** The calendar date, YYYY-MM-DD, of a moment in a time zone (this device's by default). */
export function localDate(moment: Date | string = new Date(), timeZone?: string): string {
  const key = timeZone ?? ''
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(key, f)
  }
  const parts = f.formatToParts(typeof moment === 'string' ? new Date(moment) : moment)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// ── Card state ──────────────────────────────────────────────────────────────

function toResult(g: Grade): Result {
  return g === 'correct' ? 'correct' : g === 'close' ? 'close' : 'wrong'
}

function freshState(): CardState {
  return { firstDay: null, lastDay: null, last: null, streak: 0, due: null }
}

/** The longest gap after a review this many days before the exam. */
function maxGap(daysLeft: number): number {
  return Math.max(2, Math.round(daysLeft * GAP_RATIO))
}

/** A day's first grade for a card, applied to its state. */
function review(s: CardState, day: number, result: Result, exam: number): CardState {
  let streak = s.streak
  let gap: number
  if (result === 'wrong') {
    streak = 0
    gap = 1
  } else if (result === 'close') {
    streak = Math.min(streak, 1)
    gap = Math.min(2, maxGap(exam - day))
  } else {
    streak += 1
    gap = Math.min(2 ** streak, maxGap(exam - day))
  }
  // A gap that would reach the exam: a learned card rests, and one not yet
  // learned comes back the day before (a card missed that day, on the day).
  let due: number | null = day + gap
  if (due > exam - 1) {
    if (streak >= 2) due = null
    else if (day < exam - 1) due = exam - 1
    else due = result === 'wrong' && day < exam ? exam : null
  }
  return { firstDay: s.firstDay ?? day, lastDay: day, last: result, streak, due }
}

/** Each card's first grade per local day, oldest day first. */
function firstGradesByDay(input: PlanInput): Map<string, { day: number; result: Result }[]> {
  const known = new Set(input.cardIds)
  const sorted = input.history
    .filter((e) => known.has(e.cardId))
    .map((e) => ({ ...e, t: new Date(e.at).getTime() }))
    .filter((e) => !Number.isNaN(e.t))
    .sort((a, b) => a.t - b.t)
  const out = new Map<string, { day: number; result: Result }[]>()
  for (const e of sorted) {
    const day = dayNumber(localDate(new Date(e.t), input.timeZone))
    const list = out.get(e.cardId) ?? []
    if (list.length && list[list.length - 1].day === day) continue
    list.push({ day, result: toResult(e.grade) })
    out.set(e.cardId, list)
  }
  return out
}

// ── One day's list ──────────────────────────────────────────────────────────

const weakness: Record<Result, number> = { wrong: 0, close: 1, correct: 2 }

/**
 * The list for `day` from each card's state at the start of that day.
 * Reviews come first, weakest first; at least half the cap is kept for new
 * cards when there are new cards to introduce.
 */
function planDay(cardIds: string[], states: Map<string, CardState>, day: number, exam: number, start: number, cap: number): string[] {
  const daysLeft = exam - day
  if (daysLeft < 0 || cap < 1) return []
  const studyDays = Math.max(1, daysLeft)
  const position = new Map(cardIds.map((id, i) => [id, i]))
  const byWeakness = (a: string, b: string) => {
    const sa = states.get(a)!, sb = states.get(b)!
    return weakness[sa.last!] - weakness[sb.last!] || (sa.due ?? 0) - (sb.due ?? 0) || position.get(a)! - position.get(b)!
  }

  const unseen = cardIds.filter((id) => states.get(id)!.firstDay === null)
  const seen = cardIds.filter((id) => states.get(id)!.firstDay !== null)

  // New cards, in set order, spread evenly up to the day they should all be seen by.
  const lastNewDay = start + Math.min(MAX_NEW_WINDOW, Math.max(1, Math.floor((exam - start) / 2))) - 1
  const newWindow = Math.min(studyDays, Math.max(1, lastNewDay - day + 1))
  const fresh = unseen.slice(0, Math.ceil(unseen.length / newWindow))

  // Due today, plus a share of anything overdue.
  const dueToday = seen.filter((id) => states.get(id)!.due === day)
  const overdue = seen.filter((id) => { const d = states.get(id)!.due; return d !== null && d < day }).sort(byWeakness)
  const catchUp = overdue.slice(0, Math.max(Math.ceil(overdue.length / Math.min(CATCH_UP_DAYS, studyDays)), Math.ceil(cap * CATCH_UP_SHARE)))
  const reviews = [...dueToday, ...catchUp].sort(byWeakness)

  // The light pass: cards not yet learned and not looked at in the final
  // days, spread over the days left.
  if (daysLeft <= FINAL_DAYS) {
    const finalStart = exam - FINAL_DAYS
    const listed = new Set([...reviews, ...overdue])
    const pending = seen
      .filter((id) => {
        const s = states.get(id)!
        return !listed.has(id) && s.streak < 2 && s.lastDay! < finalStart
      })
      .sort((a, b) => states.get(a)!.streak - states.get(b)!.streak || byWeakness(a, b))
    reviews.push(...pending.slice(0, Math.ceil(pending.length / (daysLeft + 1))))
  }

  const newReserve = Math.min(fresh.length, Math.ceil(cap / 2))
  const reviewTake = Math.min(reviews.length, cap - newReserve)
  const newTake = Math.min(fresh.length, cap - reviewTake)
  return [...reviews.slice(0, reviewTake), ...fresh.slice(0, newTake)]
}

// ── The plan ────────────────────────────────────────────────────────────────

export function planToday(input: PlanInput): DayPlan {
  const { cardIds } = input
  const cap = Math.max(1, Math.floor(input.cap))
  const today = dayNumber(input.today)
  const exam = dayNumber(input.examDate)
  const start = Math.min(today, dayNumber(input.startDate ?? input.today))
  const graded = firstGradesByDay(input)

  // Each card's state at the start of today, and what was graded today.
  const states = new Map<string, CardState>()
  const gradedToday = new Map<string, Result>()
  for (const id of cardIds) {
    let s = freshState()
    for (const g of graded.get(id) ?? []) {
      if (g.day < today) s = review(s, g.day, g.result, exam)
      else if (g.day === today) gradedToday.set(id, g.result)
    }
    states.set(id, s)
  }

  const planned = planDay(cardIds, states, today, exam, start, cap)
  const remaining = planned.filter((id) => !gradedToday.has(id))

  // Where things stand now, counting today's answers.
  const now = new Map(states)
  for (const [id, r] of gradedToday) now.set(id, review(states.get(id)!, today, r, exam))
  let seen = 0
  let learned = 0
  for (const s of now.values()) {
    if (s.firstDay !== null) seen++
    if (s.streak >= 2) learned++
  }

  // Look ahead, assuming the rest of today and each coming day's list get
  // done and recalled. Tomorrow is exact once today's list is done.
  const sim = new Map(now)
  for (const id of remaining) sim.set(id, review(sim.get(id)!, today, 'correct', exam))
  const upcoming: UpcomingDay[] = []
  for (let day = today + 1; day <= exam; day++) {
    const list = planDay(cardIds, sim, day, exam, start, cap)
    if (upcoming.length < UPCOMING_DAYS) upcoming.push({ date: dateFromDay(day), count: list.length })
    // Exam day itself doesn't help see a card before the exam.
    if (day === exam) break
    for (const id of list) sim.set(id, review(sim.get(id)!, day, 'correct', exam))
  }
  let unseenAtExam = 0
  if (exam >= today) for (const s of sim.values()) if (s.firstDay === null) unseenAtExam++

  return {
    daysLeft: exam - today,
    planned,
    remaining,
    doneToday: planned.length - remaining.length,
    total: cardIds.length,
    seen,
    learned,
    upcoming,
    unseenAtExam,
  }
}

/** The next day with cards on it, after today. */
export function nextReviewDay(plan: DayPlan): UpcomingDay | null {
  return plan.upcoming.find((d) => d.count > 0) ?? null
}

// ── Words ───────────────────────────────────────────────────────────────────

/** "Exam today", "Exam tomorrow", "Exam in 9 days", "Exam was Nov 3". */
export function examLabel(examDate: string, today: string): string {
  const left = dayNumber(examDate) - dayNumber(today)
  if (left === 0) return 'Exam today'
  if (left === 1) return 'Exam tomorrow'
  if (left > 1) return `Exam in ${left} days`
  return `Exam was ${shortDate(examDate)}`
}

/** "Nov 20". */
export function shortDate(date: string): string {
  return new Date(dayNumber(date) * DAY_MS).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "Fri, Nov 20". */
export function longDate(date: string): string {
  return new Date(dayNumber(date) * DAY_MS).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "tomorrow", "on Thursday", or "on Nov 20" for further out. */
export function dayLabel(date: string, today: string): string {
  const diff = dayNumber(date) - dayNumber(today)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff > 1 && diff < 7) return `on ${new Date(dayNumber(date) * DAY_MS).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}`
  return `on ${shortDate(date)}`
}
