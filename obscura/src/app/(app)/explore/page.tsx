'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ExploreSet } from '@/types'
import { apiFetch, errorMessage, withColdStartRetry } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { proxyImageUrl } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function ExploreSetCard({
  set,
  onStarToggle,
}: {
  set: ExploreSet
  onStarToggle: (id: string) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [forking, setForking] = useState(false)

  async function handleFork() {
    setForking(true)
    try {
      const res = await apiFetch(`/sets/${set.id}/fork`, { method: 'POST' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't copy this set. Please try again."))
      const { new_set_id } = await res.json()
      toast('Copied to your library')
      router.push(`/sets/${new_set_id}`)
    } catch (err) {
      toast((err as Error).message, 'error')
      setForking(false)
    }
    // On success the button stays disabled until navigation, so a double
    // click can't create two copies.
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface p-6 border border-line shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      {/* Thumbnail */}
      {set.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxyImageUrl(set.thumbnail_url)}
          alt=""
          className="w-full h-28 object-cover rounded-lg bg-paper-2"
        />
      )}

      {/* Subject + star */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              {set.subject}
            </span>
          )}
        </div>
        <button
          onClick={() => onStarToggle(set.id)}
          aria-pressed={set.starred_by_me}
          aria-label={`${set.starred_by_me ? 'Unstar' : 'Star'} ${set.title} (${set.star_count})`}
          className="flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-warn transition-colors"
        >
          <Icon name="star" size={18} filled={set.starred_by_me} className={set.starred_by_me ? 'text-warn' : 'text-ink-muted'} />
          <span>{set.star_count}</span>
        </button>
      </div>

      {/* Title */}
      <h3
        className="font-headline text-base font-bold text-ink leading-snug line-clamp-2"
      >
        {set.title}
      </h3>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted font-medium">
        <div className="flex items-center gap-1">
          <Icon name="quiz" size={15} />
          {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
        </div>
      </div>

      {/* Copy to library */}
      <div className="mt-auto pt-4 border-t border-paper-2">
        <button
          onClick={handleFork}
          disabled={forking}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-ink text-xs font-bold text-ink hover:bg-ink hover:text-on-ink transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {forking ? <Spinner /> : <Icon name="library_add" size={16} />}
          Copy to library
        </button>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [sets, setSets] = useState<ExploreSet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const { toast } = useToast()
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setLoadError(false)
    withColdStartRetry(() => apiFetch('/explore'))
      .then(async (r) => {
        if (!r.ok) throw new Error()
        setSets(await r.json())
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const subjects = useMemo(() => {
    const seen = new Set<string>()
    sets.forEach((s) => { if (s.subject) seen.add(s.subject) })
    return Array.from(seen).sort()
  }, [sets])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return sets.filter((s) => {
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.subject?.toLowerCase().includes(q) ?? false)
      const matchesSubject = !activeSubject || s.subject === activeSubject
      return matchesQuery && matchesSubject
    })
  }, [sets, query, activeSubject])

  function handleStarToggle(id: string) {
    setSets((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              starred_by_me: !s.starred_by_me,
              star_count: s.star_count + (s.starred_by_me ? -1 : 1),
            }
          : s
      )
    )
    apiFetch(`/sets/${id}/star`, { method: 'POST' }).then((r) => {
      if (!r.ok) throw new Error()
    }).catch(() => {
      toast("Couldn't update the star. Please try again.", 'error')
      // revert on failure
      setSets((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                starred_by_me: !s.starred_by_me,
                star_count: s.star_count + (s.starred_by_me ? -1 : 1),
              }
            : s
        )
      )
    })
  }

  return (
    <div className="py-4 sm:py-8 space-y-8">
      {/* Header */}
      <section className="space-y-2">
        <h2
          className="font-headline text-4xl font-extrabold tracking-tight text-ink"
        >
          Public Library
        </h2>
        <p className="text-ink-muted max-w-md">
          Browse and copy study sets shared by the community.
        </p>
      </section>

      {/* Search */}
      <div className="relative max-w-md">
        <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search by title or subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-surface border border-line pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
        />
      </div>

      {/* Subject chips */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubject(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              activeSubject === null
                ? 'bg-ink text-on-ink'
                : 'bg-paper text-ink-muted hover:bg-line'
            }`}
          >
            All
          </button>
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setActiveSubject(activeSubject === subj ? null : subj)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                activeSubject === subj
                  ? 'bg-accent text-on-ink'
                  : 'bg-paper text-ink-muted hover:bg-line'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-ink-muted gap-2">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-24 text-ink-muted gap-3">
          <Icon name="cloud_off" size={48} />
          <p className="text-sm font-medium">Couldn&apos;t load public sets — the study server didn&apos;t respond.</p>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-paper-2 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-ink-muted gap-3">
          <Icon name="search_off" size={48} />
          <p className="text-sm font-medium">
            {sets.length === 0 ? 'No public sets yet' : 'No sets match your search'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => (
            <ExploreSetCard key={s.id} set={s} onStarToggle={handleStarToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
