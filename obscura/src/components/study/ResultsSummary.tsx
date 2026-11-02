'use client'

import Link from 'next/link'
import type { Card, Set } from '@/types'
import type { Grade } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

interface CardAnswer {
  card: Card
  grade: Grade
  time_taken_ms: number
  labelGrades?: Grade[]
}

interface ResultsSummaryProps {
  set: Set
  answers: CardAnswer[]
  onRetryMissed: (cards: Card[]) => void
  onStudyAgain: () => void
}

const gradeConfig: Record<Grade, { label: string; bg: string; text: string; dot: string }> = {
  correct: { label: 'Correct', bg: 'bg-good-soft', text: 'text-good', dot: 'bg-good' },
  close: { label: 'Close', bg: 'bg-warn-soft', text: 'text-warn', dot: 'bg-warn' },
  wrong: { label: 'Missed', bg: 'bg-bad-soft', text: 'text-bad', dot: 'bg-bad' },
  empty: { label: 'Skipped', bg: 'bg-paper-2', text: 'text-ink-muted', dot: 'bg-line' },
}

function cardLabel(card: Card): string {
  if (card.type === 'flashcard') return card.front.length > 80 ? card.front.slice(0, 80) + '…' : card.front
  return `Diagram (${card.labels.length} labels)`
}

export default function ResultsSummary({ set, answers, onRetryMissed, onStudyAgain }: ResultsSummaryProps) {
  const total = answers.length
  const correct = answers.filter((a) => a.grade === 'correct').length
  const close = answers.filter((a) => a.grade === 'close').length
  const wrong = answers.filter((a) => a.grade === 'wrong').length
  const empty = answers.filter((a) => a.grade === 'empty').length
  const pct = total > 0 ? Math.round(((correct + close * 0.5) / total) * 100) : 0

  const missedCards = answers
    .filter((a) => a.grade === 'wrong' || a.grade === 'empty')
    .map((a) => a.card)

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">

      {/* Score hero */}
      <div className="rounded-xl bg-surface border border-line p-8 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink via-accent to-ink" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent block mb-2">
          Session Complete
        </span>
        <p className="font-headline text-7xl font-black text-ink tabular-nums">
          {pct}%
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {correct} correct · {close} close · {wrong + empty} missed
        </p>

        {/* Score bar */}
        <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-paper-2">
          {total > 0 && (
            <>
              <div className="bg-good transition-all" style={{ width: `${(correct / total) * 100}%` }} />
              <div className="bg-warn transition-all" style={{ width: `${(close / total) * 100}%` }} />
              <div className="bg-bad transition-all" style={{ width: `${(wrong / total) * 100}%` }} />
              <div className="bg-line transition-all" style={{ width: `${(empty / total) * 100}%` }} />
            </>
          )}
        </div>

        <div className="mt-3 flex justify-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-good" /> {correct} correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warn" /> {close} close
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-bad" /> {wrong} missed
          </span>
          {empty > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-line" /> {empty} skipped
            </span>
          )}
        </div>
      </div>

      {/* Per-card breakdown */}
      <div>
        <h2 className="font-headline text-sm font-bold text-ink mb-3 uppercase tracking-widest">
          Card Breakdown
        </h2>
        <div className="flex flex-col gap-1.5">
          {answers.map((answer, i) => {
            const cfg = gradeConfig[answer.grade]
            return (
              <div key={i} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5', cfg.bg)}>
                <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                <p className="flex-1 text-sm text-ink truncate">{cardLabel(answer.card)}</p>
                <span className={cn('text-xs font-medium shrink-0', cfg.text)}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/sets/${set.id}`}
          className="text-sm font-medium text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
        >
          <Icon name="arrow_back" size={16} />
          Back to set
        </Link>

        <div className="flex gap-3">
          {missedCards.length > 0 && (
            <button
              onClick={() => onRetryMissed(missedCards)}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-paper-2 transition-colors"
            >
              Retry {missedCards.length} missed
            </button>
          )}
          {/* A link to this same URL wouldn't reset the session — restart it in place. */}
          <button
            type="button"
            onClick={onStudyAgain}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-on-ink hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Icon name="replay" size={16} />
            Study again
          </button>
        </div>
      </div>
    </div>
  )
}
