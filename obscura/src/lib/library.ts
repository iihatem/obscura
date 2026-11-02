import type { Grade } from './scoring'
import { tally } from './study'

export interface SessionRow {
  set_id: string
  completed_at: string | null
  card_results: { grade: Grade }[] | null
}

export interface SetStats {
  lastStudiedAt: string
  lastScore: number
}

/**
 * The latest finished session per set, newest first. Sessions with no answers
 * (left before the first card was graded) don't count as studying.
 */
export function statsBySet(rows: SessionRow[]): Map<string, SetStats> {
  const out = new Map<string, SetStats>()
  const finished = rows
    .filter((r) => r.completed_at && r.card_results?.length)
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))
  for (const r of finished) {
    if (out.has(r.set_id)) continue
    out.set(r.set_id, { lastStudiedAt: r.completed_at!, lastScore: tally(r.card_results!.map((c) => c.grade)).pct })
  }
  return out
}

export function relativeDate(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const w = Math.floor(days / 7)
    return w === 1 ? 'last week' : `${w} weeks ago`
  }
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'last month' : `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? 'last year' : `${years} years ago`
}

export type SortKey = 'recent' | 'title'

export function filterAndSort<T extends { title: string; subject: string | null; updated_at: string }>(
  sets: T[], query: string, sort: SortKey
): T[] {
  const q = query.trim().toLowerCase()
  const hits = q
    ? sets.filter((s) => s.title.toLowerCase().includes(q) || (s.subject ?? '').toLowerCase().includes(q))
    : sets
  return [...hits].sort((a, b) =>
    sort === 'title'
      ? a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
      : b.updated_at.localeCompare(a.updated_at)
  )
}
