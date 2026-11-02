'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { relativeDate } from '@/lib/library'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ContinueStudyingProps {
  setId: string
  title: string
  subject: string | null
  lastStudiedAt: string
  lastScore: number
  cardCount: number
}

export default function ContinueStudying({ setId, title, subject, lastStudiedAt, lastScore, cardCount }: ContinueStudyingProps) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-accent">Pick up where you left off</p>
        <h2 className="mt-1 truncate text-[22px] font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {subject && <>{subject} · </>}
          {cardCount} cards · studied {relativeDate(lastStudiedAt)} ·{' '}
          <span className={cn('font-semibold', lastScore >= 80 ? 'text-good' : lastScore >= 50 ? 'text-warn' : 'text-bad')}>
            {lastScore}% last time
          </span>
        </p>
      </div>
      <Link href={`/sets/${setId}/study`} className={cn(buttonClass('primary', 'lg'), 'w-full sm:w-auto')}>
        <Play className="h-4 w-4" aria-hidden />
        Study now
      </Link>
    </section>
  )
}
