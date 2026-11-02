import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetGrid from '@/components/sets/SetGrid'
import ContinueStudying from '@/components/sets/ContinueStudying'
import ApiKeyNotice from '@/components/library/ApiKeyNotice'
import { statsBySet, type SessionRow } from '@/lib/library'
import type { Set } from '@/types'

export default async function LibraryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
  const db = supabase as any
  const [{ data: setRows }, { data: sessionRows }] = await Promise.all([
    db.from('sets').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    db.from('study_sessions')
      .select('set_id, completed_at, card_results(grade)')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(200),
  ])

  const sets: Set[] = setRows ?? []
  const stats = statsBySet((sessionRows ?? []) as SessionRow[])

  // The first diagram image per set, for card thumbnails.
  const thumbMap: Record<string, string> = {}
  if (sets.length > 0) {
    const { data: thumbData } = await db.from('cards')
      .select('set_id, image_url')
      .in('set_id', sets.map((s) => s.id))
      .eq('type', 'diagram')
      .not('image_url', 'is', null)
      .order('position', { ascending: true })
    for (const card of thumbData ?? []) {
      if (!thumbMap[card.set_id]) thumbMap[card.set_id] = card.image_url
    }
  }

  const items = sets.map((s) => ({
    ...s,
    thumbnail_url: thumbMap[s.id] ?? null,
    lastStudiedAt: stats.get(s.id)?.lastStudiedAt ?? null,
    lastScore: stats.get(s.id)?.lastScore ?? null,
  }))

  // The set studied most recently that still has cards to study.
  const resume = items
    .filter((s) => s.lastStudiedAt && s.card_count > 0)
    .sort((a, b) => (a.lastStudiedAt! < b.lastStudiedAt! ? 1 : -1))[0] ?? null

  return (
    <div className="flex flex-col gap-8 py-4 sm:py-8">
      <header>
        <h1 className="text-[28px] font-extrabold text-ink sm:text-4xl">Your library</h1>
        {sets.length > 0 && (
          <p className="mt-1 text-ink-muted">
            {sets.length} {sets.length === 1 ? 'set' : 'sets'} · {sets.reduce((n, s) => n + s.card_count, 0)} cards
          </p>
        )}
      </header>

      {resume && (
        <ContinueStudying
          setId={resume.id}
          title={resume.title}
          subject={resume.subject}
          lastStudiedAt={resume.lastStudiedAt!}
          lastScore={resume.lastScore!}
          cardCount={resume.card_count}
        />
      )}

      <ApiKeyNotice />

      <SetGrid sets={items} />
    </div>
  )
}
