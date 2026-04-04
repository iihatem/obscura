'use client'

import Link from 'next/link'
import type { Card, Set } from '@/types'
import type { Grade } from '@/lib/scoring'
import { cn } from '@/lib/utils'

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
}

const gradeConfig: Record<Grade, { label: string; bg: string; text: string; dot: string }> = {
  correct: { label: 'Correct', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  close: { label: 'Close', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  wrong: { label: 'Missed', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  empty: { label: 'Skipped', bg: 'bg-stone-50', text: 'text-stone-500', dot: 'bg-stone-300' },
}

function cardLabel(card: Card): string {
  if (card.type === 'flashcard') return card.front.length > 80 ? card.front.slice(0, 80) + '…' : card.front
  return `Diagram (${card.labels.length} labels)`
}

export default function ResultsSummary({ set, answers, onRetryMissed }: ResultsSummaryProps) {
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
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400 mb-2">Score</p>
        <p className="text-6xl font-bold text-stone-900 tabular-nums">{pct}%</p>
        <p className="mt-2 text-sm text-stone-500">
          {correct} correct · {close} close · {wrong + empty} missed
        </p>

        {/* Mini bar */}
        <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
          {total > 0 && (
            <>
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(correct / total) * 100}%` }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${(close / total) * 100}%` }}
              />
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${(wrong / total) * 100}%` }}
              />
              <div
                className="bg-stone-200 transition-all"
                style={{ width: `${(empty / total) * 100}%` }}
              />
            </>
          )}
        </div>

        <div className="mt-3 flex justify-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {correct} correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {close} close
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> {wrong} missed
          </span>
          {empty > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-200" /> {empty} skipped
            </span>
          )}
        </div>
      </div>

      {/* Per-card breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Card breakdown</h2>
        <div className="flex flex-col gap-1.5">
          {answers.map((answer, i) => {
            const cfg = gradeConfig[answer.grade]
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5',
                  cfg.bg
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                <p className="flex-1 text-sm text-stone-700 truncate">{cardLabel(answer.card)}</p>
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
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Back to set
        </Link>

        <div className="flex gap-3">
          {missedCards.length > 0 && (
            <button
              onClick={() => onRetryMissed(missedCards)}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Retry {missedCards.length} missed
            </button>
          )}
          <Link
            href={`/sets/${set.id}/study`}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Study again
          </Link>
        </div>
      </div>
    </div>
  )
}
