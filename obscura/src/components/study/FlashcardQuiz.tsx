'use client'

import { useEffect, useRef, useState } from 'react'
import type { FlashCard } from '@/types'
import type { Grade } from '@/lib/scoring'
import { swipeGrade, SWIPE_THRESHOLD } from '@/lib/study'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface FlashcardQuizProps {
  card: FlashCard
  onAnswer: (grade: Grade) => void
}

export const GRADE_BUTTONS: { grade: Grade; label: string; key: string; className: string }[] = [
  { grade: 'correct', label: 'Confident', key: '1', className: 'bg-good-soft text-good hover:ring-2 hover:ring-good/40' },
  { grade: 'close', label: 'Almost', key: '2', className: 'bg-warn-soft text-warn hover:ring-2 hover:ring-warn/40' },
  { grade: 'wrong', label: 'Need review', key: '3', className: 'bg-bad-soft text-bad hover:ring-2 hover:ring-bad/40' },
]

/**
 * Tap the card (or press Space) to flip it, then grade with the buttons in
 * thumb reach, the 1–3 keys, or a swipe: right for Confident, left for Need review.
 */
export default function FlashcardQuiz({ card, onAnswer }: FlashcardQuizProps) {
  const [revealed, setRevealed] = useState(false)
  const [dx, setDx] = useState(0)
  const drag = useRef<{ x: number; id: number } | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      // A focused button already turns Space/Enter into a click.
      if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.key === 'Enter')) return
      if (!revealed && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
        return
      }
      if (revealed && !e.repeat) {
        const hit = GRADE_BUTTONS.find((b) => b.key === e.key)
        if (hit) onAnswer(hit.grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, onAnswer])

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
              <button
                type="button"
                onClick={() => setRevealed(true)}
                aria-label="Show the answer"
                tabIndex={revealed ? -1 : 0}
                className="flip-card-face flex min-h-[min(52dvh,420px)] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center shadow-lift [grid-area:1/1]"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Question</span>
                <span className="font-headline text-[22px] font-bold leading-snug text-ink sm:text-[28px]">{card.front}</span>
              </button>
              <div
                aria-hidden={!revealed}
                className="flip-card-face flip-card-back flex min-h-[min(52dvh,420px)] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-accent/30 bg-surface p-8 text-center shadow-lift [grid-area:1/1]"
              >
                <span className="max-w-md text-sm text-ink-muted">{card.front}</span>
                <span className="h-px w-12 bg-line" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Answer</span>
                <span className="whitespace-pre-wrap text-lg leading-relaxed text-ink sm:text-[22px]">{card.back}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-paper/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          {!revealed ? (
            <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
              Show answer
              <kbd className="hidden rounded border border-on-ink/30 px-1.5 text-xs font-medium opacity-70 sm:inline">Space</kbd>
            </Button>
          ) : (
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="How well did you know it?">
              {GRADE_BUTTONS.map((b) => (
                <button
                  key={b.grade}
                  type="button"
                  onClick={() => onAnswer(b.grade)}
                  className={cn('flex h-14 flex-col items-center justify-center rounded-2xl text-[15px] font-semibold transition active:scale-[0.97]', b.className)}
                >
                  {b.label}
                  <kbd className="hidden text-[11px] font-medium opacity-60 sm:block">{b.key}</kbd>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-center text-xs text-ink-muted sm:hidden">
            {revealed ? 'Or swipe the card: right if you knew it, left if not' : 'Tap the card to flip it'}
          </p>
        </div>
      </div>
    </div>
  )
}
