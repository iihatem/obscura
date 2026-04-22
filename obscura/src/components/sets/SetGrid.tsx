'use client'

import { useState } from 'react'
import type { Set } from '@/types'
import SetCard from './SetCard'
import EmptyState from '@/components/ui/EmptyState'

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
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#75777d] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sets…"
            className="w-full pl-9 pr-4 h-10 rounded-lg bg-white border border-[#e7e8e9] text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 focus:border-[#006972] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75777d] hover:text-[#051125] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-[#75777d] font-medium">No sets match "{query}"</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((set) => (
            <SetCard key={set.id} set={set} />
          ))}
        </div>
      )}
    </div>
  )
}
