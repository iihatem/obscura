'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookPlus, Compass, Search, Star, X } from 'lucide-react'
import { apiFetch, errorMessage } from '@/lib/api'
import { subjectChips, subjectKey } from '@/lib/explore'
import { relativeDate } from '@/lib/library'
import { cn, plural, proxyImageUrl } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import SegmentedControl from '@/components/ui/SegmentedControl'

export interface ExploreItem {
  id: string
  owner_id: string
  title: string
  subject: string | null
  description: string | null
  card_count: number
  star_count: number
  updated_at: string
  owner_name: string | null
  starred: boolean
  thumbnail_url: string | null
}

type Sort = 'popular' | 'new'

export default function ExploreView({ sets: initial, userId }: { sets: ExploreItem[]; userId: string }) {
  const [sets, setSets] = useState(initial)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('popular')
  const { toast } = useToast()

  const chips = useMemo(() => subjectChips(sets), [sets])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hits = sets.filter((s) =>
      (!subject || subjectKey(s.subject) === subject) &&
      (!q || s.title.toLowerCase().includes(q) || (s.subject ?? '').toLowerCase().includes(q) || (s.owner_name ?? '').toLowerCase().includes(q))
    )
    return sort === 'new'
      ? [...hits].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      : hits
  }, [sets, query, subject, sort])

  function flipStar(id: string) {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, starred: !s.starred, star_count: s.star_count + (s.starred ? -1 : 1) } : s)))
  }

  async function toggleStar(id: string) {
    flipStar(id)
    try {
      const res = await apiFetch(`/sets/${id}/star`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      flipStar(id)
      toast("Couldn't update the star. Please try again.", 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 sm:py-8">
      <header>
        <h1 className="text-[28px] font-extrabold text-ink sm:text-4xl">Explore</h1>
        <p className="mt-1 text-ink-muted">Sets other students made public. Open one to look through it, or copy it into your library.</p>
      </header>

      {sets.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, course or author"
                aria-label="Search public sets"
                className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-paper-2 hover:text-ink">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <SegmentedControl
              className="self-start sm:self-auto"
              label="Sort"
              size="sm"
              value={sort}
              onChange={setSort}
              options={[{ value: 'popular', label: 'Most starred' }, { value: 'new', label: 'Newest' }]}
            />
          </div>
          {chips.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by subject">
              <Chip active={subject === null} onClick={() => setSubject(null)}>All</Chip>
              {chips.map((c) => (
                <Chip key={c.key} active={subject === c.key} onClick={() => setSubject(subject === c.key ? null : c.key)}>
                  {c.label} <span className="opacity-60">{c.count}</span>
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {sets.length === 0 ? (
        <section className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
            <Compass className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-[22px] font-bold text-ink">No public sets yet</h2>
          <p className="mt-2 max-w-md text-ink-muted">Make one of yours public from its Share button and it will show up here for other students.</p>
        </section>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-ink-muted">No public sets match{query.trim() ? ` “${query.trim()}”` : ' this subject'}.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <ExploreCard key={s.id} set={s} mine={s.owner_id === userId} onStar={() => toggleStar(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors',
        active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-muted hover:border-ink-muted/50 hover:text-ink'
      )}
    >
      {children}
    </button>
  )
}

function ExploreCard({ set, mine, onStar }: { set: ExploreItem; mine: boolean; onStar: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const [copying, setCopying] = useState(false)

  async function copy() {
    setCopying(true)
    try {
      const res = await apiFetch(`/sets/${set.id}/fork`, { method: 'POST' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't copy this set. Please try again."))
      const { new_set_id } = await res.json()
      toast('Copied to your library')
      router.push(`/sets/${new_set_id}`)
    } catch (err) {
      toast((err as Error).message, 'error')
      setCopying(false)
    }
    // On success the button stays busy until navigation, so a double click
    // can't create two copies.
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-ink-muted/40 hover:shadow-lift">
      <Link href={`/sets/${set.id}`} className="flex flex-1 flex-col gap-2 p-5">
        {set.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxyImageUrl(set.thumbnail_url)} alt="" className="-mx-5 -mt-5 mb-2 h-32 w-[calc(100%+2.5rem)] max-w-none border-b border-line bg-paper-2 object-cover" />
        )}
        {set.subject && <span className="truncate text-xs font-semibold uppercase tracking-wider text-accent">{set.subject}</span>}
        <h3 className="line-clamp-2 font-headline text-lg font-bold leading-snug text-ink">{set.title}</h3>
        <p className="text-[13px] text-ink-muted">
          {plural(set.card_count, 'card')}
          {set.owner_name && <> · by {mine ? 'you' : set.owner_name}</>}
          {' · '}updated {relativeDate(set.updated_at)}
        </p>
      </Link>
      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={onStar}
          aria-pressed={set.starred}
          aria-label={`${set.starred ? 'Unstar' : 'Star'} ${set.title}`}
          className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-ink-muted transition hover:bg-paper-2 hover:text-ink"
        >
          <Star className={cn('h-4 w-4', set.starred && 'fill-current text-warn')} aria-hidden />
          <span className="tabular-nums">{set.star_count}</span>
        </button>
        {mine ? (
          <span className="ml-auto px-2 text-[13px] text-ink-muted">Your set</span>
        ) : (
          <Button size="sm" variant="secondary" className="ml-auto" loading={copying} onClick={copy}>
            {!copying && <BookPlus className="h-4 w-4" aria-hidden />}
            Copy to library
          </Button>
        )}
      </div>
    </div>
  )
}
