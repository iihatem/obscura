import { createClient } from '@/lib/supabase/client'
import type { CardSuggestion, ReviewSuggestion, SuggestionInsert, SuggestionStatus } from './suggestions'

// Suggestions go straight to Supabase; row-level security decides who may
// send, read and resolve them (see supabase/migrations/*_card_suggestions.sql).

export interface DbError {
  code?: string
  message?: string
}

// The generated Database type predates this table, like the escape hatch in explore/page.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (createClient() as any).from('card_suggestions')

export async function sendSuggestion(row: SuggestionInsert): Promise<DbError | null> {
  try {
    const { error } = await table().insert(row)
    return error ?? null
  } catch {
    return { message: 'network' }
  }
}

/** Open suggestions on one of the caller's sets, oldest first. */
export async function listOpenSuggestions(setId: string): Promise<ReviewSuggestion[]> {
  const { data, error } = await table()
    .select('*, profiles!author_id(display_name)')
    .eq('set_id', setId)
    .eq('status', 'open')
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) throw error
  return ((data ?? []) as (CardSuggestion & { profiles: { display_name: string | null } | null })[])
    .map(({ profiles, ...s }) => ({ ...s, author_name: profiles?.display_name ?? null }))
}

export async function resolveSuggestion(id: string, status: Exclude<SuggestionStatus, 'open'>): Promise<void> {
  const { data, error } = await table().update({ status }).eq('id', id).select('id')
  if (error) throw error
  // RLS turns a forbidden update into zero rows rather than an error.
  if (!data?.length) throw new Error('not_found')
}
