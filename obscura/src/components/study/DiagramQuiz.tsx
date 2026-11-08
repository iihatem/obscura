'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Tag } from 'lucide-react'
import type { DiagramCard } from '@/types'
import { gradeAnswer, type Grade } from '@/lib/scoring'
import { aggregateGrades } from '@/lib/study'
import { cn, proxyImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface DiagramQuizProps {
  card: DiagramCard
  onAnswer?: (grade: Grade, labelGrades: Grade[]) => void
  /** Practice tests: hand back what was typed, with no marking and no peeking. */
  onSubmitAnswers?: (answers: string[]) => void
}

const boxGrade: Record<Grade, string> = {
  correct: 'border-good bg-good-soft text-good',
  close: 'border-warn bg-warn-soft text-warn',
  wrong: 'border-bad bg-bad-soft text-bad',
  empty: 'border-bad bg-bad-soft text-bad',
}

export default function DiagramQuiz({ card, onAnswer, onSubmitAnswers }: DiagramQuizProps) {
  if (card.labels.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxyImageUrl(card.image_url)} alt="Diagram" className="block h-auto w-full opacity-60" />
          </div>
          <Tag className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="font-headline text-lg font-bold text-ink">This diagram has no labels to quiz</p>
            <p className="mt-1 text-sm text-ink-muted">You can add label boxes to it from the set page.</p>
          </div>
        </div>
        <ActionBar>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => onAnswer?.('empty', [])}>
            Skip this diagram
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </ActionBar>
      </div>
    )
  }
  return <DiagramQuizInner card={card} onAnswer={onAnswer} onSubmitAnswers={onSubmitAnswers} />
}

function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-paper/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">{children}</div>
    </div>
  )
}

/**
 * Every label is covered. Pick a box (or just start typing), name it in the one
 * answer field, and Enter moves to the next box. Typing in a field below the
 * picture, instead of inside tiny boxes on it, keeps phones from zooming in and
 * keeps the whole diagram in view.
 */
function DiagramQuizInner({ card, onAnswer, onSubmitAnswers }: DiagramQuizProps) {
  const { labels } = card
  const [answers, setAnswers] = useState<string[]>(() => labels.map(() => ''))
  const [current, setCurrent] = useState(0)
  const [grades, setGrades] = useState<Grade[] | null>(null)
  const [peek, setPeek] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Phones raise the keyboard on focus; only do it for keyboards we know are there.
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus()
  }, [])

  const filled = answers.filter((a) => a.trim()).length

  function select(i: number) {
    setCurrent(i)
    input.current?.focus()
  }

  function submit() {
    if (onSubmitAnswers) return onSubmitAnswers(answers)
    setGrades(answers.map((a, i) => gradeAnswer(a, labels[i].label)))
    setPeek(false)
    requestAnimationFrame(() => continueRef.current?.focus())
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const nextEmpty = answers.findIndex((a, i) => i > current && !a.trim())
    const anyEmpty = answers.findIndex((a, i) => i !== current && !a.trim())
    if (nextEmpty !== -1) setCurrent(nextEmpty)
    else if (anyEmpty !== -1) setCurrent(anyEmpty)
    else submit()
  }

  const missed = grades
    ? labels.map((l, i) => ({ l, i, g: grades[i] })).filter((x) => x.g !== 'correct')
    : []

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-start justify-center px-4 py-4 sm:items-center sm:py-6">
        {/* Overlay boxes are % of THIS container, so the image must keep its natural
            aspect ratio (w-full h-auto) — no object-contain or max-height. */}
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proxyImageUrl(card.image_url)} alt="Diagram with its labels covered" className="block h-auto w-full" />
          {labels.map((label, i) => {
            const g = grades?.[i]
            const active = !grades && i === current
            return (
              <button
                key={i}
                type="button"
                disabled={!!grades}
                onClick={() => select(i)}
                aria-label={grades ? `Label ${i + 1}: ${label.label}` : `Label ${i + 1}${answers[i] ? `, your answer: ${answers[i]}` : ''}`}
                aria-pressed={active}
                className={cn(
                  'absolute flex items-center justify-center overflow-hidden rounded-[4px] border-2 px-0.5 text-[11px] font-semibold leading-tight transition-colors sm:text-xs',
                  g
                    ? boxGrade[g]
                    : active
                      ? 'z-10 border-accent bg-cover text-on-cover ring-4 ring-accent/30'
                      : peek
                        ? 'border-ink-muted bg-cover/35 text-transparent'
                        : 'border-cover bg-cover text-on-cover/80'
                )}
                style={{ left: `${label.x}%`, top: `${label.y}%`, width: `${label.width}%`, height: `${label.height}%` }}
              >
                <span className="truncate">{g ? label.label : answers[i] || i + 1}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ActionBar>
        {!grades ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-ink-muted">
                Label <b className="text-ink">{current + 1}</b> of {labels.length}
                <span className="mx-1.5">·</span>
                {filled} answered
              </span>
              <span className="flex items-center gap-1">
                {!onSubmitAnswers && (
                  <IconButton label={peek ? 'Cover the diagram again' : 'Peek at the diagram'} size="sm" onClick={() => setPeek((p) => !p)}>
                    {peek ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </IconButton>
                )}
                <IconButton label="Previous label" size="sm" onClick={() => select((current - 1 + labels.length) % labels.length)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </IconButton>
                <IconButton label="Next label" size="sm" onClick={() => select((current + 1) % labels.length)}>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </IconButton>
              </span>
            </div>
            <div className="flex gap-2">
              <input
                ref={input}
                value={answers[current]}
                onChange={(e) => setAnswers((prev) => prev.map((a, i) => (i === current ? e.target.value : a)))}
                onKeyDown={onKeyDown}
                aria-label={`Name label ${current + 1}`}
                placeholder={`Name label ${current + 1}`}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint={filled >= labels.length - 1 ? 'done' : 'next'}
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
              />
              {onSubmitAnswers ? (
                <Button size="lg" onClick={submit}>
                  {filled === 0 ? 'Skip' : 'Next'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button size="lg" onClick={submit} disabled={filled === 0}>
                  <Check className="h-4 w-4" aria-hidden />
                  Check
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {missed.length > 0 ? (
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-sm" aria-label="Corrections">
                {missed.map(({ l, i, g }) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-ink-muted">
                      <b className="mr-1.5 text-ink">{i + 1}</b>
                      {answers[i].trim() ? <s className="decoration-bad/60">{answers[i]}</s> : <i>blank</i>}
                      <span className="mx-1.5">→</span>
                      <span className="text-ink">{l.label}</span>
                    </span>
                    <span className={cn('shrink-0 text-xs font-semibold', g === 'close' ? 'text-warn' : 'text-bad')}>{g === 'close' ? 'Almost' : 'Missed'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-semibold text-good">All {labels.length} labels right.</p>
            )}
            <Button ref={continueRef} size="lg" className="w-full" onClick={() => onAnswer?.(aggregateGrades(grades), grades)}>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        )}
      </ActionBar>
    </div>
  )
}
