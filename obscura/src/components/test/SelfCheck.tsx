'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Grade } from '@/lib/scoring'
import type { QuestionResult } from '@/lib/practiceTest'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const MARKS: { grade: Grade; label: string; on: string; off: string }[] = [
  { grade: 'correct', label: 'Right', on: 'bg-good text-surface', off: 'bg-good-soft text-good hover:ring-2 hover:ring-good/40' },
  { grade: 'close', label: 'Almost', on: 'bg-warn text-surface', off: 'bg-warn-soft text-warn hover:ring-2 hover:ring-warn/40' },
  { grade: 'wrong', label: 'Missed', on: 'bg-bad text-surface', off: 'bg-bad-soft text-bad hover:ring-2 hover:ring-bad/40' },
]

interface SelfCheckProps {
  results: QuestionResult[]
  /** Positions in results of the long answers to mark. */
  pending: number[]
  timedOut: boolean
  onDone: (marks: Map<number, Grade>) => void
}

/**
 * Long answers are too free-form to check automatically, so before the score
 * the student marks each one against the real answer, as in typed study.
 */
export default function SelfCheck({ results, pending, timedOut, onDone }: SelfCheckProps) {
  const [marks, setMarks] = useState<Map<number, Grade>>(new Map())
  const left = pending.length - marks.size

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      {timedOut && <p role="status" className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">Time&apos;s up. Questions you didn&apos;t reach count as missed.</p>}
      <h1 className="text-[28px] font-extrabold text-ink">Mark your long answers</h1>
      <p className="mt-2 text-ink-muted">These are too long to check automatically. Compare each one with the answer, then see your score.</p>

      <ol className="mt-6 flex flex-col gap-4">
        {pending.map((i, n) => {
          const r = results[i]
          const typed = r.response.kind === 'typed' ? r.response.text.trim() : ''
          const mark = marks.get(i)
          return (
            <li key={i} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <p className="text-xs font-semibold text-ink-muted">{n + 1} of {pending.length}</p>
              <p className="mt-1 font-headline font-bold text-ink">{r.question.card.front}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-paper p-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Your answer</span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{typed}</p>
                </div>
                <div className="rounded-xl border border-accent/30 bg-accent-soft p-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Answer</span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{r.question.card.back}</p>
                </div>
              </div>
              <div role="radiogroup" aria-label={`Mark answer ${n + 1}`} className="mt-3 grid grid-cols-3 gap-2">
                {MARKS.map((m) => (
                  <button
                    key={m.grade}
                    type="button"
                    role="radio"
                    aria-checked={mark === m.grade}
                    onClick={() => setMarks((prev) => new Map(prev).set(i, m.grade))}
                    className={cn('h-11 rounded-xl text-sm font-semibold transition active:scale-[0.97]', mark === m.grade ? m.on : m.off)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ol>

      <Button size="lg" className="mt-6 w-full" disabled={left > 0} onClick={() => onDone(marks)}>
        {left > 0 ? `${left} left to mark` : 'See your score'}
        {left === 0 && <ArrowRight className="h-4 w-4" aria-hidden />}
      </Button>
    </div>
  )
}
