'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { FlashCard } from '@/types'
import type { Grade } from '@/lib/scoring'
import { swipeGrade, typedAnswerGrade, SWIPE_THRESHOLD } from '@/lib/study'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import PageTag from '@/components/ui/PageTag'

interface FlashcardQuizProps {
  card: FlashCard
  onAnswer: (grade: Grade) => void
  /** Type the answer before the card flips, instead of answering in your head. */
  typed?: boolean
}

export const GRADE_BUTTONS: { grade: Grade; label: string; key: string; className: string; suggested: string }[] = [
  { grade: 'correct', label: 'Confident', key: '1', className: 'bg-good-soft text-good hover:ring-2 hover:ring-good/40', suggested: 'ring-2 ring-good' },
  { grade: 'close', label: 'Almost', key: '2', className: 'bg-warn-soft text-warn hover:ring-2 hover:ring-warn/40', suggested: 'ring-2 ring-warn' },
  { grade: 'wrong', label: 'Need review', key: '3', className: 'bg-bad-soft text-bad hover:ring-2 hover:ring-bad/40', suggested: 'ring-2 ring-bad' },
]

const VERDICTS: Partial<Record<Grade, { text: string; className: string }>> = {
  correct: { text: 'Looks right', className: 'bg-good-soft text-good' },
  close: { text: 'Close', className: 'bg-warn-soft text-warn' },
  wrong: { text: "Doesn't match", className: 'bg-bad-soft text-bad' },
}

/**
 * Tap the card (or press Space) to flip it, then grade with the buttons in
 * thumb reach, the 1–3 keys, or a swipe: right for Confident, left for Need review.
 *
 * In typed mode the student writes an answer first. Short answers get a
 * suggested grade they can change; longer ones sit beside the real answer for
 * the student to grade themselves.
 */
export default function FlashcardQuiz({ card, onAnswer, typed = false }: FlashcardQuizProps) {
  const [revealed, setRevealed] = useState(false)
  const [dx, setDx] = useState(0)
  const [draft, setDraft] = useState('')
  /** What the student typed, once they've checked it. */
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [suggested, setSuggested] = useState<Grade | null>(null)
  const drag = useRef<{ x: number; id: number } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const gradeRow = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Phones raise the keyboard on focus; only do it for keyboards we know are there.
    if (typed && window.matchMedia('(pointer: fine)').matches) input.current?.focus()
  }, [typed])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      // A focused button already turns Space/Enter into a click.
      if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.key === 'Enter')) return
      if (!revealed) {
        if (!typed && (e.code === 'Space' || e.key === 'Enter')) {
          e.preventDefault()
          setRevealed(true)
        }
        return
      }
      if (e.repeat) return
      if (e.key === 'Enter' && suggested) {
        e.preventDefault()
        onAnswer(suggested)
        return
      }
      const hit = GRADE_BUTTONS.find((b) => b.key === e.key)
      if (hit) onAnswer(hit.grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, typed, suggested, onAnswer])

  /** Flip to the answer. An empty check and "I don't know" both land on Need review. */
  function check(text: string) {
    setSubmitted(text.trim())
    setSuggested(typedAnswerGrade(text, card.back))
    setRevealed(true)
    // Off the input, so the phone keyboard drops and the grade buttons are in reach.
    requestAnimationFrame(() => gradeRow.current?.focus())
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!revealed || e.pointerType === 'mouse') return
    drag.current = { x: e.clientX, id: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x)
  }
  function onPointerUp(e: React.PointerEvent) {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    const grade = swipeGrade(dx)
    setDx(0)
    if (grade) onAnswer(grade)
  }

  const lean = Math.max(-1, Math.min(1, dx / SWIPE_THRESHOLD))
  const verdict = submitted ? (suggested && VERDICTS[suggested]) : submitted === '' ? { text: 'No answer', className: 'bg-bad-soft text-bad' } : null
  const faceClass = 'flip-card-face flex min-h-[min(52dvh,420px)] w-full flex-col items-center justify-center gap-4 rounded-3xl border bg-surface text-center shadow-lift [grid-area:1/1]'
  const question = <span className="font-headline text-[22px] font-bold leading-snug text-ink sm:text-[28px]">{card.front}</span>

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="relative w-full max-w-xl">
          {/* Swipe hints, fading in as the card leans */}
          <span aria-hidden className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-good px-3 py-1 text-[13px] font-bold text-surface transition-opacity" style={{ opacity: Math.max(0, lean) }}>Confident</span>
          <span aria-hidden className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-bad px-3 py-1 text-[13px] font-bold text-surface transition-opacity" style={{ opacity: Math.max(0, -lean) }}>Need review</span>

          <div
            className="flip-card-scene touch-pan-y"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { drag.current = null; setDx(0) }}
            style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 24}deg)` : undefined, transition: dx ? 'none' : 'transform .2s ease' }}
          >
            {/* Both faces share one grid cell, so the card is as tall as its longer side. */}
            <div className={cn('flip-card-inner grid', revealed && 'flipped')}>
              {typed ? (
                <div aria-hidden={revealed} className={cn(faceClass, 'border-line p-8')}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Question</span>
                  {question}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  aria-label="Show the answer"
                  tabIndex={revealed ? -1 : 0}
                  className={cn(faceClass, 'border-line p-8')}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Question</span>
                  {question}
                </button>
              )}
              <div aria-hidden={!revealed} className={cn(faceClass, 'flip-card-back border-accent/30', typed ? 'p-5 sm:p-8' : 'p-8')}>
                <span className="max-w-md text-sm text-ink-muted">{card.front}</span>
                <span className="h-px w-12 bg-line" />
                {typed ? (
                  <>
                    {verdict && (
                      <span role="status" className={cn('rounded-full px-3 py-1 text-[13px] font-semibold', verdict.className)}>{verdict.text}</span>
                    )}
                    <div className="grid w-full gap-3 text-left sm:grid-cols-2">
                      <div className="rounded-2xl border border-line bg-paper p-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Your answer</span>
                        <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-ink">
                          {submitted || <span className="italic text-ink-muted">Nothing typed</span>}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Answer</span>
                        <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-ink">{card.back}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Answer</span>
                    <span className="whitespace-pre-wrap text-lg leading-relaxed text-ink sm:text-[22px]">{card.back}</span>
                  </>
                )}
                <PageTag page={card.source_page} className="mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-paper/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          {!revealed && typed ? (
            <>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); check(draft) }}>
                <input
                  ref={input}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="Your answer"
                  placeholder="Type your answer"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
                />
                <Button type="submit" size="lg">
                  <Check className="h-4 w-4" aria-hidden />
                  Check
                </Button>
              </form>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => check('')}>
                I don&apos;t know
              </Button>
            </>
          ) : !revealed ? (
            <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
              Show answer
              <kbd className="hidden rounded border border-on-ink/30 px-1.5 text-xs font-medium opacity-70 sm:inline">Space</kbd>
            </Button>
          ) : (
            // A focus target only, so it skips the global focus ring.
            <div ref={gradeRow} tabIndex={-1} style={{ outline: 'none' }}>
              {typed && (
                <p className="mb-2 text-center text-sm text-ink-muted">
                  {suggested ? 'Count it as…' : 'Compare the two, then grade yourself'}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="How well did you know it?">
                {GRADE_BUTTONS.map((b) => (
                  <button
                    key={b.grade}
                    type="button"
                    onClick={() => onAnswer(b.grade)}
                    aria-label={typed && suggested === b.grade ? `${b.label} (suggested)` : undefined}
                    className={cn('flex h-14 flex-col items-center justify-center rounded-2xl text-[15px] font-semibold transition active:scale-[0.97]', b.className, typed && suggested === b.grade && b.suggested)}
                  >
                    {b.label}
                    <kbd className="hidden text-[11px] font-medium opacity-60 sm:block">
                      {typed && suggested === b.grade ? `${b.key} or Enter` : b.key}
                    </kbd>
                  </button>
                ))}
              </div>
            </div>
          )}
          {(revealed || !typed) && (
            <p className="mt-2 text-center text-xs text-ink-muted sm:hidden">
              {revealed ? 'Or swipe the card: right if you knew it, left if not' : 'Tap the card to flip it'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
