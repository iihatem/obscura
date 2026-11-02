'use client'

import { useEffect, useState } from 'react'
import type { Set } from '@/types'
import { draftSetIds } from '@/lib/drafts'
import SetCard from './SetCard'
import EmptyState from '@/components/ui/EmptyState'
import Icon from '@/components/ui/Icon'

const StackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

interface SetGridProps {
  sets: Set[]
  emptyAction?: { label: string; href?: string; onClick?: () => void }
  searchable?: boolean
}

export default function SetGrid({ sets, emptyAction, searchable }: SetGridProps) {
  const [query, setQuery] = useState('')
  // Sets with generated cards not yet saved, so they're easy to find again.
  const [drafts, setDrafts] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    draftSetIds().then((ids) => setDrafts(new Set(ids)))
  }, [])

  const filtered = query.trim()
    ? sets.filter((s) =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.subject ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : sets

  if (sets.length === 0) {
    return (
      <EmptyState
        icon={<StackIcon />}
        heading="No sets yet"
        subtext="Create your first set by uploading lecture slides or adding cards manually."
        action={emptyAction ?? { label: 'New set', href: '/sets/new' }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {searchable && (
        <div className="relative max-w-sm">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sets…"
            className="w-full pl-9 pr-4 h-10 rounded-lg bg-surface border border-line text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted font-medium">No sets match &quot;{query}&quot;</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((set) => (
            <SetCard key={set.id} set={set} hasDraft={drafts.has(set.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
