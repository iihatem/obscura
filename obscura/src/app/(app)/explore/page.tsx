import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExploreView, { type ExploreItem } from '@/components/explore/ExploreView'

// Public sets are readable straight from the database (the sets policy allows
// public rows), so Explore loads with the page instead of waiting on the API,
// which may be asleep.
export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
  const db = supabase as any
  const { data: sets } = await db.from('sets')
    .select('id, owner_id, title, subject, description, card_count, star_count, updated_at, profiles!owner_id(display_name)')
    .eq('visibility', 'public')
    .gt('card_count', 0)
    .order('star_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(120)

  const rows = (sets ?? []) as (Omit<ExploreItem, 'owner_name' | 'starred' | 'thumbnail_url'> & { profiles: { display_name: string | null } | null })[]
  const ids = rows.map((s) => s.id)

  const [{ data: stars }, { data: thumbs }] = ids.length
    ? await Promise.all([
        db.from('set_stars').select('set_id').eq('user_id', user.id).in('set_id', ids),
        db.from('cards').select('set_id, image_url').in('set_id', ids).eq('type', 'diagram').not('image_url', 'is', null).order('position', { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }]

  const starred = new Set<string>((stars ?? []).map((s: { set_id: string }) => s.set_id))
  const thumbMap: Record<string, string> = {}
  for (const c of (thumbs ?? []) as { set_id: string; image_url: string }[]) {
    if (!thumbMap[c.set_id]) thumbMap[c.set_id] = c.image_url
  }

  const items: ExploreItem[] = rows.map(({ profiles, ...s }) => ({
    ...s,
    owner_name: profiles?.display_name ?? null,
    starred: starred.has(s.id),
    thumbnail_url: thumbMap[s.id] ?? null,
  }))

  return <ExploreView sets={items} userId={user.id} />
}
