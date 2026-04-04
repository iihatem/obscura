'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ExploreSet } from '@/types'
import { apiFetch } from '@/lib/api'

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
  const [forking, setForking] = useState(false)

  async function handleFork() {
    setForking(true)
    try {
      const res = await apiFetch(`/sets/${set.id}/fork`, { method: 'POST' })
      if (!res.ok) throw new Error('Fork failed')
      const { new_set_id } = await res.json()
      router.push(`/sets/${new_set_id}`)
    } finally {
      setForking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-6 border border-[#e7e8e9] shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      {/* Subject + star */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#006972]">
              {set.subject}
            </span>
          )}
        </div>
        <button
          onClick={() => onStarToggle(set.id)}
          className="flex items-center gap-1 text-xs font-bold text-[#45474d] hover:text-[#e8b400] transition-colors"
        >
          <span
            className="material-symbols-outlined text-[18px] transition-colors"
            style={{
              color: set.starred_by_me ? '#e8b400' : '#c5c6cd',
              fontVariationSettings: set.starred_by_me ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            star
          </span>
          <span>{set.star_count}</span>
        </button>
      </div>

      {/* Title */}
      <h3
        className="text-base font-bold text-[#051125] leading-snug line-clamp-2"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        {set.title}
      </h3>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#75777d] font-medium">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">quiz</span>
          {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
        </div>
        {set.owner_display_name && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">person</span>
            {set.owner_display_name}
          </div>
        )}
      </div>

      {/* Copy to library */}
      <div className="mt-auto pt-4 border-t border-[#edeeef]">
        <button
          onClick={handleFork}
          disabled={forking}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-[#051125] text-xs font-bold text-[#051125] hover:bg-[#051125] hover:text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {forking ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">library_add</span>}
          Copy to library
        </button>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [sets, setSets] = useState<ExploreSet[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/explore')
      .then((r) => r.json())
      .then((data) => setSets(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
    apiFetch(`/sets/${id}/star`, { method: 'POST' }).catch(() => {
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
    <div className="p-8 lg:p-12 space-y-8">
      {/* Header */}
      <section className="space-y-2">
        <h2
          className="text-4xl font-extrabold tracking-tight text-[#051125]"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          Public Library
        </h2>
        <p className="text-[#45474d] max-w-md">
          Browse and copy study sets shared by the community.
        </p>
      </section>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#75777d] text-[18px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          placeholder="Search by title or subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-white border border-[#e7e8e9] pl-9 pr-4 py-2.5 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 focus:border-[#006972]/40 transition-all"
        />
      </div>

      {/* Subject chips */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubject(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              activeSubject === null
                ? 'bg-[#051125] text-white'
                : 'bg-[#f3f4f5] text-[#45474d] hover:bg-[#e7e8e9]'
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
                  ? 'bg-[#006972] text-white'
                  : 'bg-[#f3f4f5] text-[#45474d] hover:bg-[#e7e8e9]'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#75777d] gap-2">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#75777d] gap-3">
          <span className="material-symbols-outlined text-[48px]">search_off</span>
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
