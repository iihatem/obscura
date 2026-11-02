'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DiagramCard, Label } from '@/types'
import type { Grade } from '@/lib/scoring'
import { gradeAnswer } from '@/lib/scoring'
import { cn, proxyImageUrl } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

interface DiagramQuizProps {
  card: DiagramCard
  onAnswer: (grade: Grade, labelGrades: Grade[]) => void
}

const gradeStyle: Record<Grade, string> = {
  correct: 'border-good bg-good/35',
  close: 'border-warn bg-warn/35',
  wrong: 'border-bad bg-bad/35',
  empty: 'border-bad bg-bad/35',
}

function aggregateGrades(grades: Grade[]): Grade {
  if (!grades.length || grades.every((g) => g === 'empty')) return 'empty'
  const nonEmpty = grades.filter((g) => g !== 'empty')
  if (nonEmpty.some((g) => g === 'wrong')) return 'wrong'
  if (nonEmpty.some((g) => g === 'close')) return 'close'
  return 'correct'
}

export default function DiagramQuiz({ card, onAnswer }: DiagramQuizProps) {
  if (card.labels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center w-full max-w-3xl mx-auto">
        <div className="relative rounded-xl overflow-hidden border border-line bg-paper-2 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyImageUrl(card.image_url)}
            alt="Diagram"
            className="w-full h-auto block opacity-50"
          />
        </div>
        <Icon name="label_off" size={40} className="text-line" />
        <div>
          <p className="font-headline font-bold text-ink">
            No labels on this diagram
          </p>
          <p className="text-sm text-ink-muted mt-1">This card has no label boxes to fill in.</p>
        </div>
        <button
          onClick={() => onAnswer('empty', [])}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-bold text-ink hover:bg-paper transition-colors"
        >
          Skip
          <Icon name="arrow_forward" size={16} />
        </button>
      </div>
    )
  }
  return <DiagramQuizInner card={card} onAnswer={onAnswer} />
}

function DiagramQuizInner({ card, onAnswer }: DiagramQuizProps) {
  const { labels } = card

  const [answers, setAnswers] = useState<string[]>(() => labels.map(() => ''))
  const [submitted, setSubmitted] = useState(false)
  const [labelGrades, setLabelGrades] = useState<Grade[]>([])
  const [hintActive, setHintActive] = useState(false)
  const [hintCount, setHintCount] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const continueRef = useRef<HTMLButtonElement>(null)

  // Reset when card changes
  useEffect(() => {
    setAnswers(labels.map(() => ''))
    setSubmitted(false)
    setLabelGrades([])
    setHintActive(false)
    setHintCount(0)
    inputRefs.current = []
    // Focus first input after mount
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }, [card.id, labels])

  const focusNext = useCallback(
    (currentIdx: number) => {
      const next = inputRefs.current[currentIdx + 1]
      if (next) {
        next.focus()
      }
    },
    []
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (idx < labels.length - 1) {
        focusNext(idx)
      } else if (!submitted) {
        handleSubmit()
      }
    }
  }

  function handleSubmit() {
    const grades = answers.map((ans, i) => gradeAnswer(ans, labels[i].label))
    setLabelGrades(grades)
    setSubmitted(true)
    // The focused input unmounts on submit — keep the keyboard on Continue.
    requestAnimationFrame(() => continueRef.current?.focus())
  }

  function handleContinue() {
    const grades = answers.map((ans, i) => gradeAnswer(ans, labels[i].label))
    onAnswer(aggregateGrades(grades), grades)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {/* Diagram + label overlays
          IMPORTANT: the overlay <div>s are positioned as % of THIS container.
          The img must render at its natural aspect ratio (w-full h-auto) with NO
          object-contain / max-height, otherwise letterboxing shifts the coordinates. */}
      <div className="relative rounded-xl overflow-hidden border border-line bg-paper-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxyImageUrl(card.image_url)}
          alt="Diagram"
          className="w-full h-auto block"
        />

        {/* Overlay boxes */}
        {labels.map((label: Label, i: number) => {
          const grade = labelGrades[i]
          return (
            <div
              key={i}
              className={cn(
                'absolute border-2 flex flex-col overflow-hidden transition-colors',
                submitted && grade
                  ? gradeStyle[grade]
                  : hintActive
                    ? 'border-ink-muted bg-scrim'
                    : 'border-ink bg-scrim'
              )}
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
                width: `${label.width}%`,
                height: `${label.height}%`,
              }}
            >
              {submitted ? (
                // Show the right answer — colour alone never told the user what it was.
                <span
                  title={`You typed: ${answers[i] || '—'}`}
                  className="m-auto max-w-full truncate rounded bg-surface/85 px-1 text-[10px] font-bold leading-tight text-ink"
                >
                  {label.label}
                </span>
              ) : (
                <input
                  aria-label={`Label ${i + 1} of ${labels.length}`}
                  ref={(el) => { inputRefs.current[i] = el }}
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers]
                    next[i] = e.target.value
                    setAnswers(next)
                  }}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder="?"
                  className="w-full h-full bg-transparent text-on-ink text-xs px-1 focus:outline-none placeholder:text-ink-muted"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Hint text */}
      {!submitted && (
        <p className="text-xs text-ink-muted text-center">
          Type labels into each box · Enter to advance · Use Hint to peek at the diagram
        </p>
      )}

      {/* After submit: grade legend */}
      {submitted && (
        <div className="flex items-center justify-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-good inline-block" />
            Correct ({labelGrades.filter((g) => g === 'correct').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-warn inline-block" />
            Close ({labelGrades.filter((g) => g === 'close').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-bad inline-block" />
            Missed ({labelGrades.filter((g) => g === 'wrong' || g === 'empty').length})
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        {!submitted ? (
          <>
            <button
              onClick={() => setHintActive((h) => {
                if (!h) setHintCount((c) => c + 1)
                return !h
              })}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-all active:scale-95',
                hintActive
                  ? 'border-warn bg-warn-soft text-warn'
                  : 'border-line bg-surface text-ink hover:bg-paper'
              )}
            >
              <Icon name="lightbulb" size={16} />
              Hint
              {hintCount > 0 && (
                <span className="text-[11px] font-medium opacity-60">{hintCount}×</span>
              )}
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-ink px-6 py-2.5 text-sm font-bold text-on-ink hover:opacity-90 active:scale-95 transition-all"
            >
              Submit
              <Icon name="check" size={16} />
            </button>
          </>
        ) : (
          <button
            ref={continueRef}
            onClick={handleContinue}
            className="flex items-center gap-2 rounded-lg bg-ink px-6 py-2.5 text-sm font-bold text-on-ink hover:opacity-90 active:scale-95 transition-all"
          >
            Continue
            <Icon name="arrow_forward" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
