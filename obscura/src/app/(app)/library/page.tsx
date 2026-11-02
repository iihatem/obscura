import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetGrid from '@/components/sets/SetGrid'
import RecentSessionSpotlight from '@/components/sets/RecentSessionSpotlight'
import ApiKeyNotice from '@/components/library/ApiKeyNotice'
import type { Set } from '@/types'
import Icon from '@/components/ui/Icon'

export default async function LibraryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
  const { data } = await (supabase.from('sets') as any)
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const sets: Set[] = data ?? []

  // Fetch the first diagram image per set for thumbnail previews
  const setIds = sets.map((s) => s.id)
  const thumbMap: Record<string, string> = {}
  if (setIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
    const { data: thumbData } = await (supabase.from('cards') as any)
      .select('set_id, image_url')
      .in('set_id', setIds)
      .eq('type', 'diagram')
      .not('image_url', 'is', null)
      .order('position', { ascending: true })
    for (const card of thumbData ?? []) {
      if (!thumbMap[card.set_id]) thumbMap[card.set_id] = card.image_url
    }
  }
  const setsWithThumbs = sets.map((s) => ({ ...s, thumbnail_url: thumbMap[s.id] ?? null }))

  return (
    <div className="py-4 sm:py-8 space-y-12">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="flex items-end justify-between">
        <div className="space-y-2">
          <h2
            className="font-headline text-4xl font-extrabold tracking-tight text-ink"
          >
            Library Collections
          </h2>
          <p className="text-ink-muted max-w-md">
            Curating your intellectual assets. Access and organize your quiz sets with scholarly precision.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/sets/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-on-ink rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-ink/20"
          >
            <Icon name="add" size={18} />
            New Set
          </Link>
        </div>
      </section>

      {/* ── Shared-key allowance note (hidden once the user adds their own) ─ */}
      <ApiKeyNotice />

      {/* ── Recent Session Spotlight ──────────────────────────────── */}
      <RecentSessionSpotlight />

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <SetGrid sets={setsWithThumbs} searchable />
    </div>
  )
}
