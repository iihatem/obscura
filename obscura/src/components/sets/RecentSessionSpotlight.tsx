'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import type { SessionHistoryItem } from '@/app/(app)/profile/page'
import Icon from '@/components/ui/Icon'

const modeLabel: Record<string, string> = {
  flashcard: 'Flashcards',
  diagram: 'Diagrams',
  mixed: 'Mixed',
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export default function RecentSessionSpotlight() {
  const [session, setSession] = useState<SessionHistoryItem | null>(null)

  useEffect(() => {
    apiFetch('/sessions/history')
      .then((r) => r.ok ? r.json() : [])
      .then((data: SessionHistoryItem[]) => setSession(data[0] ?? null))
      .catch(() => {})
  }, [])

  if (!session) return null

  // On the dark ink panel the soft tones read as the light versions of good/warn/bad.
  const scoreColor =
    session.score_pct >= 80 ? 'text-good-soft' : session.score_pct >= 50 ? 'text-warn-soft' : 'text-bad-soft'

  return (
    <section className="relative overflow-hidden rounded-xl bg-ink p-8 text-on-ink flex items-center justify-between gap-6">
      {/* Background icon */}
      <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none select-none">
        <Icon name="history_edu" size={144} />
      </div>

      {/* Left: info */}
      <div className="relative z-10 space-y-3 min-w-0">
        <span className="inline-block px-3 py-1 bg-surface/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-surface/10">
          Last session · {relativeDate(session.completed_at)}
        </span>
        <h3
          className="font-headline text-2xl font-extrabold truncate max-w-sm"
        >
          {session.set_title}
        </h3>
        <p className="text-on-ink/70 text-sm">
          {modeLabel[session.mode]} · {session.total_cards} cards
        </p>
      </div>

      {/* Right: score + CTA */}
      <div className="relative z-10 flex flex-col items-end gap-3 shrink-0">
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-ink/60">Score</p>
          <p
            className={`font-headline text-4xl font-extrabold leading-none ${scoreColor}`}
          >
            {session.score_pct}%
          </p>
        </div>
        <Link
          href={`/sets/${session.set_id}/study`}
          className="inline-flex items-center gap-2 bg-surface/15 hover:bg-surface/25 border border-surface/20 rounded-lg px-4 py-2 text-sm font-bold text-on-ink transition-colors"
        >
          <Icon name="replay" size={16} />
          Study again
        </Link>
      </div>
    </section>
  )
}
