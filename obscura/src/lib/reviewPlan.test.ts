import { describe, it, expect } from 'vitest'
import type { Grade } from './scoring'
import {
  addDays, dayLabel, examLabel, localDate, nextReviewDay, planToday,
  type GradeEvent, type PlanInput,
} from './reviewPlan'

const TODAY = '2026-11-08'
const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`)
/** Noon UTC on a date, so the day is the same in UTC whichever way you look. */
const at = (date: string, hour = 12) => `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`
const ev = (cardId: string, grade: Grade, date: string, hour?: number): GradeEvent => ({ cardId, grade, at: at(date, hour) })

function plan(over: Partial<PlanInput> = {}) {
  return planToday({ cardIds: ids(10), history: [], examDate: addDays(TODAY, 9), today: TODAY, cap: 30, timeZone: 'UTC', ...over })
}

/**
 * Studies each day's remaining list, grading with `grade`, from `from` up to
 * (not including) `until`. Returns the history and each day's list.
 */
function studyThrough(base: Omit<PlanInput, 'today' | 'history'> & { history?: GradeEvent[] }, from: string, until: string, grade: (id: string, date: string) => Grade = () => 'correct') {
  const history = [...(base.history ?? [])]
  const days: { date: string; list: string[] }[] = []
  for (let d = from; d < until; d = addDays(d, 1)) {
    const p = planToday({ startDate: from, ...base, history, today: d, timeZone: 'UTC' })
    days.push({ date: d, list: p.remaining })
    for (const id of p.remaining) history.push(ev(id, grade(id, d), d))
  }
  return { history, days }
}

describe('a new set', () => {
  it('starts with a share of the new cards, in set order', () => {
    // 9 days left: new cards spread over the first 4.
    const p = plan({ cardIds: ids(40) })
    expect(p.planned).toEqual(ids(10))
    expect(p.remaining).toEqual(ids(10))
    expect(p.doneToday).toBe(0)
    expect(p.seen).toBe(0)
    expect(p.learned).toBe(0)
    expect(p.total).toBe(40)
  })

  it('has every card seen in the first half of the time left', () => {
    const exam = addDays(TODAY, 9)
    const { history } = studyThrough({ cardIds: ids(40), examDate: exam, cap: 30 }, TODAY, addDays(TODAY, 4))
    expect(new Set(history.map((e) => e.cardId)).size).toBe(40)
  })

  it('spreads new cards from the day the plan was made', () => {
    // Made 2 days ago with the exam 9 days out: 10 a day over 4 days, so 10 today.
    const start = addDays(TODAY, -2)
    const history = ids(20).map((id, i) => ev(id, 'correct', addDays(start, i < 10 ? 0 : 1)))
    const p = plan({ cardIds: ids(40), history, startDate: start, examDate: addDays(start, 9) })
    expect(p.planned.filter((id) => Number(id.slice(1)) > 20)).toEqual(ids(30).slice(20))
  })

  it('introduces cards added late as soon as there is room', () => {
    const start = addDays(TODAY, -10)
    const p = plan({ cardIds: ids(12), startDate: start, examDate: addDays(TODAY, 10) })
    expect(p.planned).toHaveLength(12)
  })

  it('spreads new cards over two weeks at most, however far off the exam is', () => {
    const p = plan({ cardIds: ids(140), examDate: addDays(TODAY, 90), cap: 50 })
    expect(p.planned).toHaveLength(10)
  })

  it('says nothing is unseen at the exam when the cap allows it', () => {
    expect(plan({ cardIds: ids(40) }).unseenAtExam).toBe(0)
  })
})

describe('the daily cap', () => {
  it('never puts more than the cap on a day', () => {
    const p = plan({ cardIds: ids(200), examDate: addDays(TODAY, 2), cap: 30 })
    expect(p.planned).toHaveLength(30)
  })

  it('warns when the cap is too low to see every card before the exam', () => {
    // Two study days at 30 a day can't cover 200 cards.
    const p = plan({ cardIds: ids(200), examDate: addDays(TODAY, 2), cap: 30 })
    expect(p.unseenAtExam).toBeGreaterThan(100)
  })

  it('keeps half the cap for new cards when reviews could fill it', () => {
    // 40 cards missed yesterday, 40 never seen.
    const history = ids(40).map((id) => ev(id, 'wrong', addDays(TODAY, -1)))
    const p = plan({ cardIds: ids(80), history, examDate: addDays(TODAY, 2), cap: 20 })
    expect(p.planned).toHaveLength(20)
    expect(p.planned.filter((id) => Number(id.slice(1)) > 40)).toHaveLength(10)
  })

  it('lets reviews use the slots new cards leave free', () => {
    const history = ids(40).map((id) => ev(id, 'wrong', addDays(TODAY, -1)))
    const p = plan({ cardIds: ids(42), history, examDate: addDays(TODAY, 2), cap: 20 })
    expect(p.planned).toHaveLength(20)
    expect(p.planned.slice(-2)).toEqual(['c41', 'c42'])
  })
})

describe('grades and gaps', () => {
  it('brings Need review back the next day', () => {
    const history = [ev('c1', 'wrong', addDays(TODAY, -1)), ev('c2', 'correct', addDays(TODAY, -1))]
    const p = plan({ cardIds: ids(2), history })
    expect(p.planned).toEqual(['c1'])
  })

  it('counts a skipped diagram as Need review', () => {
    const p = plan({ cardIds: ids(1), history: [ev('c1', 'empty', addDays(TODAY, -1))] })
    expect(p.planned).toEqual(['c1'])
  })

  it('brings Almost back in two days', () => {
    const history = [ev('c1', 'close', addDays(TODAY, -2)), ev('c2', 'close', addDays(TODAY, -1))]
    expect(plan({ cardIds: ids(2), history }).planned).toEqual(['c1'])
  })

  it('widens the gap with each recall: 2, then 4, then 8 days', () => {
    const exam = addDays(TODAY, 60)
    const reviewDays: string[] = []
    const history: GradeEvent[] = []
    for (let d = TODAY; d < addDays(TODAY, 30); d = addDays(d, 1)) {
      const p = planToday({ cardIds: ['c1'], history, examDate: exam, today: d, cap: 30, timeZone: 'UTC' })
      if (p.remaining.length) {
        reviewDays.push(d)
        history.push(ev('c1', 'correct', d))
      }
    }
    const gaps = reviewDays.slice(1).map((d, i) => Math.round((Date.parse(d) - Date.parse(reviewDays[i])) / 86_400_000))
    expect(gaps.slice(0, 3)).toEqual([2, 4, 8])
  })

  it('caps the gap at about a fifth of the time left', () => {
    // Confident four times on separate days would mean 16 days; with 30 days left the gap is 6.
    const d0 = addDays(TODAY, -6)
    const history = [ev('c1', 'correct', addDays(d0, -14)), ev('c1', 'correct', addDays(d0, -12)), ev('c1', 'correct', addDays(d0, -8)), ev('c1', 'correct', d0)]
    const exam = addDays(d0, 30)
    expect(plan({ cardIds: ['c1'], history, examDate: exam, today: addDays(d0, 5) }).planned).toEqual([])
    expect(plan({ cardIds: ['c1'], history, examDate: exam, today: addDays(d0, 6) }).planned).toEqual(['c1'])
  })

  it('never lets a gap run past the exam', () => {
    // Both due today, two days before the exam. Today's 2-day gap would land on exam day:
    // the card not yet learned comes back the day before, and the learned one rests.
    const exam = addDays(TODAY, 2)
    const history = [ev('c1', 'correct', addDays(TODAY, -2)), ev('c2', 'close', addDays(TODAY, -2))]
    const { history: after } = studyThrough({ cardIds: ['c1', 'c2'], history, examDate: exam, cap: 30 }, TODAY, addDays(exam, 1), (id) => (id === 'c1' ? 'correct' : 'close'))
    const daysOf = (id: string) => after.filter((e) => e.cardId === id && e.at >= at(TODAY, 0)).map((e) => e.at.slice(0, 10))
    expect(daysOf('c1')).toEqual([TODAY])
    expect(daysOf('c2')).toEqual([TODAY, addDays(exam, -1)])
  })

  it('only counts the first grade of a day', () => {
    // Need review, then right on a second pass the same evening: still back tomorrow.
    const y = addDays(TODAY, -1)
    const history = [ev('c1', 'wrong', y, 10), ev('c1', 'correct', y, 11)]
    expect(plan({ cardIds: ['c1'], history }).planned).toEqual(['c1'])
  })
})

describe('learned cards', () => {
  it("doesn't count one Confident as learned", () => {
    const p = plan({ cardIds: ids(1), history: [ev('c1', 'correct', addDays(TODAY, -1))] })
    expect(p.seen).toBe(1)
    expect(p.learned).toBe(0)
  })

  it("doesn't count two Confidents on the same day", () => {
    const y = addDays(TODAY, -1)
    const p = plan({ cardIds: ids(1), history: [ev('c1', 'correct', y, 9), ev('c1', 'correct', y, 18)] })
    expect(p.learned).toBe(0)
  })

  it('counts Confident on two separate days', () => {
    const p = plan({ cardIds: ids(1), history: [ev('c1', 'correct', addDays(TODAY, -3)), ev('c1', 'correct', addDays(TODAY, -1))] })
    expect(p.learned).toBe(1)
  })

  it('counts today’s answers', () => {
    const p = plan({ cardIds: ids(1), history: [ev('c1', 'correct', addDays(TODAY, -2)), ev('c1', 'correct', TODAY)] })
    expect(p.learned).toBe(1)
  })

  it('unlearns a card missed after being learned', () => {
    const history = [ev('c1', 'correct', addDays(TODAY, -5)), ev('c1', 'correct', addDays(TODAY, -3)), ev('c1', 'wrong', addDays(TODAY, -1))]
    const p = plan({ cardIds: ids(1), history })
    expect(p.learned).toBe(0)
    expect(p.planned).toEqual(['c1'])
  })

  it('needs a full Confident after an Almost', () => {
    const history = [ev('c1', 'correct', addDays(TODAY, -5)), ev('c1', 'close', addDays(TODAY, -3))]
    expect(plan({ cardIds: ids(1), history }).learned).toBe(0)
    expect(plan({ cardIds: ids(1), history: [...history, ev('c1', 'correct', addDays(TODAY, -1))] }).learned).toBe(1)
  })
})

describe('missed days', () => {
  // 60 cards all due on the same day, then the student stays away for 6 days.
  const due = addDays(TODAY, -6)
  const history = ids(60).map((id) => ev(id, 'wrong', addDays(due, -1)))
  const base = { cardIds: ids(60), history, examDate: addDays(TODAY, 30), cap: 30 }

  it('spreads the backlog over the next few days instead of all at once', () => {
    expect(plan(base).planned).toHaveLength(20)
    // A third of a big cap is enough to take the whole backlog.
    expect(plan({ ...base, cap: 200 }).planned).toHaveLength(60)
  })

  it('clears the backlog in a few days without going over the cap', () => {
    const { days } = studyThrough(base, TODAY, addDays(TODAY, 5))
    expect(new Set(days.flatMap((d) => d.list)).size).toBe(60)
    expect(days[0].list).toHaveLength(20)
    expect(Math.max(...days.map((d) => d.list.length))).toBeLessThanOrEqual(30)
  })

  it('still respects the cap while catching up', () => {
    expect(plan({ ...base, cap: 10 }).planned).toHaveLength(10)
  })

  it('catches up before the exam even when it is close', () => {
    const p = plan({ ...base, cap: 200, examDate: addDays(TODAY, 1) })
    expect(p.planned).toHaveLength(60)
  })
})

describe('during the day', () => {
  it('keeps the same list all day and counts what is done', () => {
    const before = plan({ cardIds: ids(40) })
    const half = before.planned.slice(0, 5)
    const after = plan({ cardIds: ids(40), history: half.map((id) => ev(id, 'correct', TODAY)) })
    expect(after.planned).toEqual(before.planned)
    expect(after.remaining).toEqual(before.planned.slice(5))
    expect(after.doneToday).toBe(5)
  })

  it('is done for today once every card on the list is studied', () => {
    const before = plan({ cardIds: ids(40) })
    const after = plan({ cardIds: ids(40), history: before.planned.map((id) => ev(id, 'wrong', TODAY)) })
    expect(after.remaining).toEqual([])
    expect(after.doneToday).toBe(before.planned.length)
  })

  it("doesn't add more cards when the student studies extra ones freely", () => {
    const before = plan({ cardIds: ids(40) })
    const extra = ids(40).slice(30).map((id) => ev(id, 'correct', TODAY))
    const after = plan({ cardIds: ids(40), history: extra })
    expect(after.planned).toEqual(before.planned)
  })
})

describe('the exam date', () => {
  it('puts every new card on the list when the exam is tomorrow', () => {
    const p = plan({ cardIds: ids(20), examDate: addDays(TODAY, 1) })
    expect(p.daysLeft).toBe(1)
    expect(p.planned).toEqual(ids(20))
  })

  it('looks ahead to exam day only when the exam is tomorrow', () => {
    const p = plan({ cardIds: ids(20), examDate: addDays(TODAY, 1) })
    expect(p.upcoming.map((d) => d.date)).toEqual([addDays(TODAY, 1)])
  })

  it('spreads a light pass over cards not yet learned across the last days', () => {
    // Exam in 2 days. c1–c20 were Almost 3 days before it, so all are due the
    // day before; c21 is learned and due then too.
    const exam = addDays(TODAY, 2)
    const history = [
      ...ids(21).map((id) => ev(id, 'correct', addDays(exam, -5))),
      ...ids(20).map((id) => ev(id, 'close', addDays(exam, -3))),
      ev('c21', 'correct', addDays(exam, -3)),
    ]
    const p = plan({ cardIds: ids(21), history, examDate: exam })
    // A third of the 20 today, rather than all 20 tomorrow; the learned card waits for its day.
    expect(p.planned).toEqual(ids(7))
  })

  it('leaves learned cards alone on exam day', () => {
    const eve = addDays(TODAY, -1)
    const history = [
      ev('c1', 'correct', addDays(TODAY, -3)), ev('c1', 'correct', eve),
      ev('c2', 'correct', addDays(TODAY, -3)), ev('c2', 'wrong', eve),
    ]
    expect(plan({ cardIds: ids(2), history, examDate: TODAY }).planned).toEqual(['c2'])
  })

  it('still has a list on exam day', () => {
    const p = plan({ cardIds: ids(3), history: [ev('c1', 'wrong', addDays(TODAY, -1))], examDate: TODAY })
    expect(p.daysLeft).toBe(0)
    expect(p.planned).toEqual(['c1', 'c2', 'c3'])
    expect(p.upcoming).toEqual([])
  })

  it('has nothing to review once the exam has passed', () => {
    const p = plan({ cardIds: ids(10), history: [ev('c1', 'wrong', addDays(TODAY, -1))], examDate: addDays(TODAY, -3) })
    expect(p.daysLeft).toBe(-3)
    expect(p.planned).toEqual([])
    expect(p.remaining).toEqual([])
    expect(p.upcoming).toEqual([])
    expect(p.unseenAtExam).toBe(0)
  })
})

describe('what comes next', () => {
  it('shows tomorrow once today is done, exactly', () => {
    const before = plan({ cardIds: ids(40) })
    const history = before.planned.map((id, i) => ev(id, i < 3 ? 'wrong' : 'correct', TODAY))
    const p = plan({ cardIds: ids(40), history })
    const tomorrow = planToday({ cardIds: ids(40), history, examDate: addDays(TODAY, 9), today: addDays(TODAY, 1), startDate: TODAY, cap: 30, timeZone: 'UTC' })
    expect(p.upcoming[0]).toEqual({ date: addDays(TODAY, 1), count: tomorrow.planned.length })
    expect(nextReviewDay(p)).toEqual(p.upcoming[0])
  })

  it('looks a week ahead at most', () => {
    expect(plan({ cardIds: ids(40), examDate: addDays(TODAY, 30) }).upcoming).toHaveLength(7)
  })

  it('skips rest days to find the next review', () => {
    const p = plan({ cardIds: ['c1'], history: [ev('c1', 'correct', TODAY)], examDate: addDays(TODAY, 30) })
    expect(p.upcoming[0].count).toBe(0)
    expect(nextReviewDay(p)).toEqual({ date: addDays(TODAY, 2), count: 1 })
  })
})

describe('time zones', () => {
  // 3am UTC on Nov 8 is 7pm Nov 7 in Los Angeles and noon Nov 8 in Tokyo.
  const history = [{ cardId: 'c1', grade: 'wrong' as Grade, at: '2026-11-08T03:00:00.000Z' }]

  it('reads answer times as the student’s local day', () => {
    expect(localDate('2026-11-08T03:00:00.000Z', 'America/Los_Angeles')).toBe('2026-11-07')
    expect(localDate('2026-11-08T03:00:00.000Z', 'Asia/Tokyo')).toBe('2026-11-08')
    expect(localDate('2026-11-08T03:00:00.000Z', 'UTC')).toBe('2026-11-08')
  })

  it('treats a late-evening answer as yesterday in the student’s time zone', () => {
    // In LA it was missed yesterday, so it's due today.
    const la = plan({ cardIds: ['c1'], history, timeZone: 'America/Los_Angeles' })
    expect(la.remaining).toEqual(['c1'])
    // In Tokyo it was answered today, so there's nothing left to do.
    const tokyo = plan({ cardIds: ['c1'], history, timeZone: 'Asia/Tokyo' })
    expect(tokyo.remaining).toEqual([])
  })

  it('handles a daylight saving change', () => {
    // US clocks went back on Nov 1, 2026.
    expect(localDate('2026-11-01T06:30:00.000Z', 'America/New_York')).toBe('2026-11-01')
    expect(localDate('2026-11-02T04:59:00.000Z', 'America/New_York')).toBe('2026-11-01')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
  })
})

describe('odd input', () => {
  it('ignores grades for cards no longer in the set and bad timestamps', () => {
    const history = [ev('gone', 'wrong', addDays(TODAY, -1)), { cardId: 'c1', grade: 'wrong' as Grade, at: 'nope' }]
    const p = plan({ cardIds: ['c1'], history })
    expect(p.planned).toEqual(['c1'])
    expect(p.seen).toBe(0)
  })

  it('handles a set with no cards', () => {
    const p = plan({ cardIds: [] })
    expect(p.planned).toEqual([])
    expect(p.total).toBe(0)
  })
})

describe('labels', () => {
  it('says when the exam is', () => {
    expect(examLabel(TODAY, TODAY)).toBe('Exam today')
    expect(examLabel(addDays(TODAY, 1), TODAY)).toBe('Exam tomorrow')
    expect(examLabel(addDays(TODAY, 9), TODAY)).toBe('Exam in 9 days')
    expect(examLabel('2026-11-03', TODAY)).toBe('Exam was Nov 3')
  })

  it('names the next day plainly', () => {
    expect(dayLabel(addDays(TODAY, 1), TODAY)).toBe('tomorrow')
    // Nov 10, 2026 is a Tuesday.
    expect(dayLabel('2026-11-10', TODAY)).toBe('on Tuesday')
    expect(dayLabel('2026-11-20', TODAY)).toBe('on Nov 20')
  })
})
