import { createClient } from '@/lib/supabase/client'
import type { ExamPlan } from './examPlans'

// The generated Database type predates this table, like suggestionsApi.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (createClient() as any).from('exam_plans')

const COLUMNS = 'set_id, exam_date, daily_cap, created_at'

/**
 * Sets or changes the student's plan for a set. The row's owner comes from
 * the session (the column defaults to auth.uid()), and only the date and the
 * limit can change afterwards, so a new plan is an insert and a change is an
 * update.
 */
export async function saveExamPlan(setId: string, examDate: string, dailyCap: number, exists: boolean): Promise<ExamPlan> {
  const values = { exam_date: examDate, daily_cap: dailyCap }
  if (!exists) {
    const { data, error } = await table().insert({ set_id: setId, ...values }).select(COLUMNS).single()
    if (!error) return data as ExamPlan
    // Already planned from another tab: change it instead.
    if (error.code !== '23505') throw error
  }
  const { data, error } = await table().update(values).eq('set_id', setId).select(COLUMNS)
  if (error) throw error
  if (!data?.length) throw new Error('not_found')
  return data[0] as ExamPlan
}

export async function clearExamPlan(setId: string): Promise<void> {
  const { error } = await table().delete().eq('set_id', setId)
  if (error) throw error
}
