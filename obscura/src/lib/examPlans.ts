import type { Grade } from './scoring'
import { localDate, planToday, type DayPlan, type GradeEvent } from './reviewPlan'

// Exam plans live in Supabase's exam_plans table; row-level security keeps
// each student to their own (see supabase/migrations/*_exam_plans.sql).
// Which cards are due is worked out from card_results by lib/reviewPlan.

export interface ExamPlan {
  set_id: string
  /** YYYY-MM-DD. */
  exam_date: string
  daily_cap: number
  created_at: string
}

/** A plan with what's needed to work out its days; passed from the server to the browser. */
export interface PlannedSet {
  plan: ExamPlan
  /** The set's cards, in set order. */
  cardIds: string[]
  history: GradeEvent[]
}

/** Today's list for a plan, by the student's local date. */
export function dayPlanFor({ plan, cardIds, history }: PlannedSet, today: string, timeZone?: string): DayPlan {
  return planToday({
    cardIds,
    history,
    examDate: plan.exam_date,
    today,
    cap: plan.daily_cap,
    startDate: localDate(plan.created_at, timeZone),
    timeZone,
  })
}

/** Just enough of a Supabase client for these reads, server or browser. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the generated Database type predates these tables
type Db = { from: (table: string) => any }

interface DbError {
  code?: string
  message?: string
}

/** The table isn't there yet: the migration hasn't been run. */
export function isMissingTable(error: DbError | null | undefined): boolean {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205')
}

/**
 * The student's plans, for one set or all of them. Null when plans aren't
 * available (the table isn't there yet, or the read failed), so the feature
 * can stay out of sight rather than look broken.
 */
export async function fetchExamPlans(db: Db, userId: string, setId?: string): Promise<ExamPlan[] | null> {
  try {
    let q = db.from('exam_plans').select('set_id, exam_date, daily_cap, created_at').eq('user_id', userId)
    if (setId) q = q.eq('set_id', setId)
    const { data, error } = await q.order('exam_date', { ascending: true })
    if (error) return null
    return (data ?? []) as ExamPlan[]
  } catch {
    return null
  }
}

const PAGE = 1000
const MAX_PAGES = 20
/** Older answers are too old to say much about what the student remembers now. */
const HISTORY_DAYS = 365

/** Every grade the student has given cards in these sets in the last year, oldest first. */
export async function fetchGradeHistory(db: Db, userId: string, setIds: string[], now = Date.now()): Promise<GradeEvent[]> {
  if (!setIds.length) return []
  const since = new Date(now - HISTORY_DAYS * 86_400_000).toISOString()
  const out: GradeEvent[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db.from('card_results')
      .select('card_id, grade, answered_at, study_sessions!inner(user_id, set_id)')
      .eq('study_sessions.user_id', userId)
      .in('study_sessions.set_id', setIds)
      .gte('answered_at', since)
      .order('answered_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error || !data) break
    for (const r of data as { card_id: string; grade: Grade; answered_at: string | null }[]) {
      if (r.answered_at) out.push({ cardId: r.card_id, grade: r.grade, at: r.answered_at })
    }
    if (data.length < PAGE) break
  }
  return out
}

/** Card ids per set, in set order. */
export async function fetchCardIds(db: Db, setIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>(setIds.map((id) => [id, []]))
  if (!setIds.length) return out
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db.from('cards')
      .select('id, set_id')
      .in('set_id', setIds)
      .order('set_id', { ascending: true })
      .order('position', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error || !data) break
    for (const c of data as { id: string; set_id: string }[]) out.get(c.set_id)?.push(c.id)
    if (data.length < PAGE) break
  }
  return out
}
