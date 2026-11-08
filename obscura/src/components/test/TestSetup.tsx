'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Image as ImageIcon, Keyboard, ListChecks } from 'lucide-react'
import type { Card, Set } from '@/types'
import {
  availableKinds,
  countOptions,
  MIN_CHOICE_CARDS,
  resolveCount,
  testPool,
  timerOptions,
  type KindSet,
  type QuestionCount,
  type QuestionKind,
} from '@/lib/practiceTest'
import Button from '@/components/ui/Button'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { cn, plural } from '@/lib/utils'

/** Off, or one of the three paces timerOptions offers. */
export type TimerPace = 'off' | '0' | '1' | '2'

export interface SetupChoice {
  count: QuestionCount
  kinds: KindSet
  pace: TimerPace
}

/** The count the student picked, or "all" once the pool is too small for it. */
export function effectiveCount(choice: SetupChoice, poolSize: number): QuestionCount {
  return countOptions(poolSize).includes(choice.count) ? choice.count : 'all'
}

/** Minutes on the clock, or null for no timer. */
export function timerMinutes(choice: SetupChoice, questions: number): number | null {
  if (choice.pace === 'off') return null
  const opts = timerOptions(questions)
  return opts[Math.min(Number(choice.pace), opts.length - 1)]
}

interface TestSetupProps {
  set: Set
  cards: Card[]
  choice: SetupChoice
  onChange: (choice: SetupChoice) => void
  onStart: () => void
}

export default function TestSetup({ set, cards, choice, onChange, onStart }: TestSetupProps) {
  const can = availableKinds(cards)
  const flashCount = cards.filter((c) => c.type === 'flashcard').length
  const diagramCount = cards.filter((c) => c.type === 'diagram' && c.labels.length > 0).length
  const pool = testPool(cards, choice.kinds).length
  const count = effectiveCount(choice, pool)
  const questions = resolveCount(count, pool)
  const minutes = timerOptions(Math.max(1, questions))

  const types: { kind: QuestionKind; title: string; detail: string; icon: React.ReactNode }[] = [
    { kind: 'typed', title: 'Typed', detail: can.typed ? `Write each answer from memory · ${plural(flashCount, 'flashcard')}` : 'This set has no flashcards', icon: <Keyboard className="h-5 w-5" aria-hidden /> },
    { kind: 'diagram', title: 'Diagram labels', detail: can.diagram ? `Name every covered label · ${plural(diagramCount, 'diagram')}` : 'This set has no labeled diagrams', icon: <ImageIcon className="h-5 w-5" aria-hidden /> },
    { kind: 'choice', title: 'Multiple choice', detail: can.choice ? 'Pick from four answers. Typing is better practice.' : `Needs at least ${MIN_CHOICE_CARDS} flashcards`, icon: <ListChecks className="h-5 w-5" aria-hidden /> },
  ]

  function toggle(kind: QuestionKind) {
    onChange({ ...choice, kinds: { ...choice.kinds, [kind]: !choice.kinds[kind] } })
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <Link href={`/sets/${set.id}`} className="flex w-fit items-center gap-1.5 rounded-full py-2 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {set.title}
      </Link>
      <h1 className="mt-6 text-[28px] font-extrabold text-ink">Practice test</h1>
      <p className="mt-2 text-ink-muted">Answer every question, then see your score. Nothing is marked until the end.</p>

      <section className="mt-8">
        <h2 id="types-heading" className="text-sm font-semibold text-ink">Question types</h2>
        <div role="group" aria-labelledby="types-heading" className="mt-3 flex flex-col gap-2">
          {types.map((t) => {
            const enabled = can[t.kind]
            const on = enabled && choice.kinds[t.kind]
            return (
              <button
                key={t.kind}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!enabled}
                onClick={() => toggle(t.kind)}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border p-4 text-left transition',
                  on ? 'border-accent bg-accent-soft/50' : 'border-line bg-surface hover:border-ink-muted',
                  !enabled && 'cursor-not-allowed opacity-50 hover:border-line'
                )}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', on ? 'bg-accent text-surface' : 'bg-paper-2 text-ink-muted')}>{t.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-headline font-bold text-ink">{t.title}</span>
                  <span className="block text-sm text-ink-muted">{t.detail}</span>
                </span>
                <span
                  aria-hidden
                  className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-accent bg-accent text-surface' : 'border-line')}
                >
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Questions</h2>
          <SegmentedControl<string>
            label="Number of questions"
            value={String(count)}
            onChange={(v) => onChange({ ...choice, count: v === 'all' ? 'all' : (Number(v) as 10 | 20) })}
            options={countOptions(pool).map((c) => ({ value: String(c), label: c === 'all' ? `All ${pool}` : String(c) }))}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Timer</h2>
          <SegmentedControl<TimerPace>
            label="Timer"
            value={choice.pace === 'off' ? 'off' : (String(Math.min(Number(choice.pace), minutes.length - 1)) as TimerPace)}
            onChange={(pace) => onChange({ ...choice, pace })}
            options={[
              { value: 'off', label: 'Off' },
              ...minutes.map((m, i) => ({ value: String(i) as TimerPace, label: `${m} min` })),
            ]}
          />
        </div>
      </section>

      <Button size="lg" className="mt-10 w-full" disabled={pool === 0} onClick={onStart}>
        {pool === 0 ? 'Pick a question type' : `Start · ${plural(questions, 'question')}`}
        {pool > 0 && <ArrowRight className="h-4 w-4" aria-hidden />}
      </Button>
    </div>
  )
}
