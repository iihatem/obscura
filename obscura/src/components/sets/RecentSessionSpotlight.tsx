'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import type { SessionHistoryItem } from '@/app/(app)/profile/page'

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

  const scoreColor =
    session.score_pct >= 80 ? '#9ff0fb' : session.score_pct >= 50 ? '#fcd34d' : '#fca5a5'

  return (
    <section className="relative overflow-hidden rounded-xl scholar-gradient p-8 text-white flex items-center justify-between gap-6">
      {/* Background icon */}
      <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none select-none">
        <span className="material-symbols-outlined" style={{ fontSize: '9rem' }}>history_edu</span>
      </div>

      {/* Left: info */}
      <div className="relative z-10 space-y-3 min-w-0">
        <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
          Last session · {relativeDate(session.completed_at)}
        </span>
        <h3
          className="text-2xl font-extrabold truncate max-w-sm"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          {session.set_title}
        </h3>
        <p className="text-white/70 text-sm">
          {modeLabel[session.mode]} · {session.total_cards} cards
        </p>
      </div>

      {/* Right: score + CTA */}
      <div className="relative z-10 flex flex-col items-end gap-3 shrink-0">
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Score</p>
          <p
            className="text-4xl font-extrabold leading-none"
            style={{ fontFamily: 'var(--font-manrope)', color: scoreColor }}
          >
            {session.score_pct}%
          </p>
        </div>
        <Link
          href={`/sets/${session.set_id}/study`}
          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">replay</span>
          Study again
        </Link>
      </div>
    </section>
  )
}
