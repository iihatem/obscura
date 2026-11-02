'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Compass, Search, Upload, X } from 'lucide-react'
import { draftSetIds } from '@/lib/drafts'
import { filterAndSort, type SortKey } from '@/lib/library'
import { buttonClass } from '@/components/ui/Button'
import SegmentedControl from '@/components/ui/SegmentedControl'
import SetCard, { type LibrarySet } from './SetCard'

export default function SetGrid({ sets }: { sets: LibrarySet[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  // Sets with generated cards not yet saved, so they're easy to find again.
  const [drafts, setDrafts] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    draftSetIds().then((ids) => setDrafts(new Set(ids)))
  }, [])

  if (sets.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
          <Upload className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-[22px] font-bold text-ink">Make your first study set</h2>
        <p className="mt-2 max-w-md text-ink-muted">
          Upload a lecture PDF and Obscura turns the text into flashcards and the diagrams into label quizzes. You review every card before it&apos;s saved.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/sets/new" className={buttonClass('primary', 'lg')}>
            <Upload className="h-4 w-4" aria-hidden />
            Upload a lecture
          </Link>
          <Link href="/explore" className={buttonClass('secondary', 'lg')}>
            <Compass className="h-4 w-4" aria-hidden />
            Browse public sets
          </Link>
        </div>
      </section>
    )
  }

  const visible = filterAndSort(sets, query, sort)

  return (
    <section className="flex flex-col gap-4" aria-label="Your sets">
      {sets.length > 3 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter your sets"
              aria-label="Filter your sets"
              className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear filter" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-paper-2 hover:text-ink">
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <SegmentedControl
            label="Sort sets"
            size="sm"
            value={sort}
            onChange={setSort}
            options={[{ value: 'recent', label: 'Recent' }, { value: 'title', label: 'A–Z' }]}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-10 text-center text-ink-muted">No sets match “{query.trim()}”.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((set) => (
            <SetCard key={set.id} set={set} hasDraft={drafts.has(set.id)} />
          ))}
        </div>
      )}
    </section>
  )
}
