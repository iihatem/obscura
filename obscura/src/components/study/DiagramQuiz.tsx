'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DiagramCard, Label } from '@/types'
import type { Grade } from '@/lib/scoring'
import { gradeAnswer } from '@/lib/scoring'
import { cn, proxyImageUrl } from '@/lib/utils'

interface DiagramQuizProps {
  card: DiagramCard
  onAnswer: (grade: Grade, labelGrades: Grade[]) => void
}

const gradeStyle: Record<Grade, string> = {
  correct: 'border-emerald-500 bg-emerald-400/35',
  close: 'border-amber-500 bg-amber-400/35',
  wrong: 'border-red-500 bg-red-400/35',
  empty: 'border-red-500 bg-red-400/35',
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
        <div className="relative rounded-xl overflow-hidden border border-[#e7e8e9] bg-[#edeeef] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyImageUrl(card.image_url)}
            alt="Diagram"
            className="w-full h-auto block opacity-50"
          />
        </div>
        <span className="material-symbols-outlined text-[40px] text-[#c5c6cd]">label_off</span>
        <div>
          <p className="font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
            No labels on this diagram
          </p>
          <p className="text-sm text-[#45474d] mt-1">This card has no label boxes to fill in.</p>
        </div>
        <button
          onClick={() => onAnswer('empty', [])}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e7e8e9] bg-white px-5 py-2.5 text-sm font-bold text-[#051125] hover:bg-[#f3f4f5] transition-colors"
        >
          Skip
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
      <div className="relative rounded-xl overflow-hidden border border-[#e7e8e9] bg-[#edeeef]">
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
                    ? 'border-stone-400 bg-black/20'
                    : 'border-stone-900 bg-black'
              )}
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
                width: `${label.width}%`,
                height: `${label.height}%`,
              }}
            >
              {submitted ? null : (
                <input
                  ref={(el) => { inputRefs.current[i] = el }}
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers]
                    next[i] = e.target.value
                    setAnswers(next)
                  }}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder="?"
                  className="w-full h-full bg-transparent text-white text-xs px-1 focus:outline-none placeholder:text-stone-500"
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
        <p className="text-xs text-[#75777d] text-center">
          Type labels into each box · Enter to advance · Use Hint to peek at the diagram
        </p>
      )}

      {/* After submit: grade legend */}
      {submitted && (
        <div className="flex items-center justify-center gap-4 text-xs text-[#45474d]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            Correct ({labelGrades.filter((g) => g === 'correct').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            Close ({labelGrades.filter((g) => g === 'close').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
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
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-[#e7e8e9] bg-white text-[#051125] hover:bg-[#f3f4f5]'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              Hint
              {hintCount > 0 && (
                <span className="text-[11px] font-medium opacity-60">{hintCount}×</span>
              )}
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg scholar-gradient px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all"
            >
              Submit
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 rounded-lg scholar-gradient px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all"
          >
            Continue
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  )
}
