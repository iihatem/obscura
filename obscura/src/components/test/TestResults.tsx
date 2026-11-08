'use client'

import Link from 'next/link'
import { ArrowLeft, RotateCcw, SlidersHorizontal, Target } from 'lucide-react'
import type { Set } from '@/types'
import type { Grade } from '@/lib/scoring'
import { cardsToStudy, groupByPage, scoreTest, type QuestionResult } from '@/lib/practiceTest'
import { cn, plural, proxyImageUrl } from '@/lib/utils'
import Button, { buttonClass } from '@/components/ui/Button'
import PageTag from '@/components/ui/PageTag'

interface TestResultsProps {
  set: Set
  results: QuestionResult[]
  timedOut: boolean
  onStudyMissed: () => void
  onRetake: () => void
  /** Whether the score made it into the student's history. */
  saveState?: 'saving' | 'saved' | 'failed'
  onChangeSettings: () => void
}

const CHIP: Record<Grade, { text: string; className: string }> = {
  correct: { text: 'Right', className: 'bg-good-soft text-good' },
  close: { text: 'Almost', className: 'bg-warn-soft text-warn' },
  wrong: { text: 'Missed', className: 'bg-bad-soft text-bad' },
  empty: { text: 'No answer', className: 'bg-bad-soft text-bad' },
}

const BOX: Record<Grade, string> = {
  correct: 'border-good bg-good-soft text-good',
  close: 'border-warn bg-warn-soft text-warn',
  wrong: 'border-bad bg-bad-soft text-bad',
  empty: 'border-bad bg-bad-soft text-bad',
}

function ScoreBar({ correct, close, total, className }: { correct: number; close: number; total: number; className?: string }) {
  const pct = (n: number) => `${(n / Math.max(1, total)) * 100}%`
  return (
    <div className={cn('flex h-2 w-full overflow-hidden rounded-full bg-paper-2', className)} aria-hidden>
      <div className="bg-good" style={{ width: pct(correct) }} />
      <div className="bg-warn" style={{ width: pct(close) }} />
      <div className="bg-bad" style={{ width: pct(total - correct - close) }} />
    </div>
  )
}

function AnswerPair({ yours, answer }: { yours: string | null; answer: string }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Your answer</span>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
          {yours || <span className="italic text-ink-muted">No answer</span>}
        </p>
      </div>
      <div className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">Answer</span>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{answer}</p>
      </div>
    </div>
  )
}

/** The diagram with every label shown, colored by how it went, and the misses listed under it. */
function DiagramReview({ r }: { r: QuestionResult }) {
  if (r.question.kind !== 'diagram' || r.response.kind !== 'diagram') return null
  const { card } = r.question
  const typed = r.response.labels
  const grades = r.labelGrades ?? []
  const misses = card.labels.map((l, i) => ({ l, i, g: grades[i] ?? 'empty' })).filter((x) => x.g !== 'correct')
  return (
    <>
      <div className="relative mt-3 w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proxyImageUrl(card.image_url)} alt="Diagram with the answers shown" className="block h-auto w-full" />
        {card.labels.map((l, i) => (
          <span
            key={i}
            className={cn('absolute flex items-center justify-center overflow-hidden rounded-[4px] border-2 px-0.5 text-[10px] font-semibold leading-tight sm:text-[11px]', BOX[grades[i] ?? 'empty'])}
            style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.width}%`, height: `${l.height}%` }}
          >
            <span className="truncate">{l.label}</span>
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm" aria-label="Labels you missed">
        {misses.map(({ l, i, g }) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 break-words text-ink-muted">
              {typed[i]?.trim() ? <s className="decoration-bad/60">{typed[i]}</s> : <i>blank</i>}
              <span className="mx-1.5">→</span>
              <span className="text-ink">{l.label}</span>
            </span>
            <span className={cn('shrink-0 text-xs font-semibold', g === 'close' ? 'text-warn' : 'text-bad')}>{g === 'close' ? 'Almost' : 'Missed'}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function MissedItem({ r }: { r: QuestionResult }) {
  const q = r.question
  const grade = r.grade ?? 'empty'
  const chip = q.kind === 'diagram' ? null : CHIP[grade]
  const right = q.kind === 'diagram' ? (r.labelGrades ?? []).filter((g) => g === 'correct').length : 0
  return (
    <li className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium text-ink">
          {q.kind === 'diagram' ? `Diagram · ${right} of ${plural(q.card.labels.length, 'label')} right` : q.card.front}
        </p>
        <span className="flex shrink-0 items-center gap-1.5">
          <PageTag page={q.card.source_page} />
          {chip && <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', chip.className)}>{chip.text}</span>}
        </span>
      </div>
      {q.kind === 'typed' && r.response.kind === 'typed' && <AnswerPair yours={r.response.text.trim()} answer={q.card.back} />}
      {q.kind === 'choice' && r.response.kind === 'choice' && (
        <AnswerPair yours={r.response.chosen === null ? null : q.options[r.response.chosen]} answer={q.options[q.answerIndex]} />
      )}
      {q.kind === 'diagram' && <DiagramReview r={r} />}
    </li>
  )
}

function RightItem({ r }: { r: QuestionResult }) {
  const q = r.question
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        {q.kind === 'diagram' ? (
          <span className="block text-[15px] text-ink">Diagram · all {plural(q.card.labels.length, 'label')}</span>
        ) : (
          <>
            <span className="block text-[15px] text-ink">{q.card.front}</span>
            <span className="mt-0.5 block whitespace-pre-wrap text-sm text-ink-muted">{q.kind === 'choice' ? q.options[q.answerIndex] : q.card.back}</span>
          </>
        )}
      </span>
      <PageTag page={q.card.source_page} />
    </li>
  )
}

export default function TestResults({ set, results, timedOut, saveState = 'saving', onStudyMissed, onRetake, onChangeSettings }: TestResultsProps) {
  const t = scoreTest(results)
  const groups = groupByPage(results)
  const byPage = results.some((r) => r.question.card.source_page)
  const missed = results.filter((r) => r.grade !== 'correct')
  const right = results.filter((r) => r.grade === 'correct')
  const toStudy = cardsToStudy(results)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <Link href={`/sets/${set.id}`} className="flex w-fit items-center gap-1.5 rounded-full py-2 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {set.title}
      </Link>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold text-accent">Practice test</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-headline text-6xl font-extrabold tabular-nums text-ink">{t.pct}%</p>
          <p className="pb-2 text-ink-muted">
            {t.correct} of {t.total} right{t.close ? `, ${t.close} almost` : ''}
          </p>
        </div>
        <ScoreBar correct={t.correct} close={t.close} total={t.total} className="mt-6 h-2.5" />

        {timedOut && (
          <p role="status" className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            Time ran out. Questions you didn&apos;t reach count as missed.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {toStudy.length > 0 ? (
            <Button size="lg" onClick={onStudyMissed} className="sm:flex-1">
              <Target className="h-4 w-4" aria-hidden />
              Study the {toStudy.length} you missed
            </Button>
          ) : (
            <Link href={`/sets/${set.id}`} className={cn(buttonClass('primary', 'lg'), 'sm:flex-1')}>Back to the set</Link>
          )}
          <Button size="lg" variant="secondary" onClick={onRetake}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Retake
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p role="status" className="text-xs text-ink-muted">
            {saveState === 'saved' ? 'Saved to your history.' : saveState === 'failed' ? "This score couldn't be saved to your history, but the results here are right." : 'Saving to your history…'}
          </p>
          <button type="button" onClick={onChangeSettings} className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Change settings
          </button>
        </div>
      </section>

      {groups.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-ink">{byPage ? 'By page' : 'By type'}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {groups.map((g) => (
              <li key={g.label} className="flex items-center gap-4 px-4 py-3">
                <span className="w-28 shrink-0 text-[15px] font-medium text-ink sm:w-36">{g.label}</span>
                <ScoreBar correct={g.correct} close={g.close} total={g.total} className="flex-1" />
                <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink-muted">
                  <b className="font-semibold text-ink">{g.correct}</b> of {g.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="h-2 w-2 rounded-full bg-bad" aria-hidden />
            To go over
            <span className="font-normal text-ink-muted">{missed.length}</span>
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {missed.map((r, i) => <MissedItem key={`${r.question.card.id}-${i}`} r={r} />)}
          </ul>
        </section>
      )}

      {right.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
            Right
            <span className="font-normal text-ink-muted">{right.length}</span>
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {right.map((r, i) => <RightItem key={`${r.question.card.id}-${i}`} r={r} />)}
          </ul>
        </section>
      )}
    </div>
  )
}
