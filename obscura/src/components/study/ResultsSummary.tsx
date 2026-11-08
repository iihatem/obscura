'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Target } from 'lucide-react'
import type { Card, Set } from '@/types'
import type { Grade } from '@/lib/scoring'
import { tally, verdict } from '@/lib/study'
import { cn } from '@/lib/utils'
import Button, { buttonClass } from '@/components/ui/Button'

export interface CardAnswer {
  card: Card
  grade: Grade
  time_taken_ms: number
  labelGrades?: Grade[]
}

interface ResultsSummaryProps {
  set: Set
  answers: CardAnswer[]
  saved: boolean
  onReview: (cards: Card[]) => void
  onStudyAgain: () => void
  /** Shown under the score, e.g. what's next in an exam plan. */
  children?: ReactNode
}

const groups: { key: string; title: string; grades: Grade[]; dot: string }[] = [
  { key: 'missed', title: 'Need review', grades: ['wrong', 'empty'], dot: 'bg-bad' },
  { key: 'close', title: 'Almost', grades: ['close'], dot: 'bg-warn' },
  { key: 'correct', title: 'Confident', grades: ['correct'], dot: 'bg-good' },
]

function cardLabel(card: Card): string {
  if (card.type === 'flashcard') return card.front
  return `Diagram · ${card.labels.length} label${card.labels.length === 1 ? '' : 's'}`
}

export default function ResultsSummary({ set, answers, saved, onReview, onStudyAgain, children }: ResultsSummaryProps) {
  const t = tally(answers.map((a) => a.grade))
  // Almost isn't known yet, so it goes back in the review pile too.
  const toReview = answers.filter((a) => a.grade !== 'correct').map((a) => a.card)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <Link href={`/sets/${set.id}`} className="flex w-fit items-center gap-1.5 rounded-full py-2 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {set.title}
      </Link>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold text-accent">Session complete</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-headline text-6xl font-extrabold tabular-nums text-ink">{t.pct}%</p>
          <p className="pb-2 text-ink-muted">
            {t.correct} of {t.total} confident{t.close ? `, ${t.close} almost` : ''}
          </p>
        </div>
        <p className="mt-3 text-lg text-ink">{verdict(t.pct)}</p>

        <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-paper-2" aria-hidden>
          <div className="bg-good" style={{ width: `${(t.correct / Math.max(1, t.total)) * 100}%` }} />
          <div className="bg-warn" style={{ width: `${(t.close / Math.max(1, t.total)) * 100}%` }} />
          <div className="bg-bad" style={{ width: `${(t.missed / Math.max(1, t.total)) * 100}%` }} />
        </div>

        {!saved && (
          <p role="status" className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            This score couldn&apos;t be saved to your history because the study server didn&apos;t respond. The results here are still right.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {toReview.length > 0 ? (
            <>
              <Button size="lg" onClick={() => onReview(toReview)} className="sm:flex-1">
                <Target className="h-4 w-4" aria-hidden />
                Review the {toReview.length} you weren&apos;t sure of
              </Button>
              <Button size="lg" variant="secondary" onClick={onStudyAgain}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Study all again
              </Button>
            </>
          ) : (
            <>
              <Link href={`/sets/${set.id}`} className={cn(buttonClass('primary', 'lg'), 'sm:flex-1')}>Back to the set</Link>
              <Button size="lg" variant="secondary" onClick={onStudyAgain}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Study again
              </Button>
            </>
          )}
        </div>
      </section>

      {children}

      <section className="mt-8 flex flex-col gap-6">
        {groups.map((g) => {
          const items = answers.filter((a) => g.grades.includes(a.grade))
          if (!items.length) return null
          return (
            <div key={g.key}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <span className={cn('h-2 w-2 rounded-full', g.dot)} aria-hidden />
                {g.title}
                <span className="font-normal text-ink-muted">{items.length}</span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {items.map((a, i) => (
                  <li key={`${a.card.id}-${i}`} className="px-4 py-3 text-[15px] text-ink">
                    <p className="line-clamp-2">{cardLabel(a.card)}</p>
                    {a.card.type === 'flashcard' && g.key !== 'correct' && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{a.card.back}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
