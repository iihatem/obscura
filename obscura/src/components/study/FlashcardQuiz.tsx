'use client'

import { useState, useEffect } from 'react'
import type { FlashCard } from '@/types'
import type { Grade } from '@/lib/scoring'
import { cn } from '@/lib/utils'

interface FlashcardQuizProps {
  card: FlashCard
  onAnswer: (grade: Grade) => void
}

const gradeButtons: { grade: Grade; label: string; key: string; className: string }[] = [
  {
    grade: 'correct',
    label: 'Got it',
    key: '1',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    grade: 'close',
    label: 'Almost',
    key: '2',
    className: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  {
    grade: 'wrong',
    label: 'Missed',
    key: '3',
    className: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  },
]

export default function FlashcardQuiz({ card, onAnswer }: FlashcardQuizProps) {
  const [revealed, setRevealed] = useState(false)

  // Reset when card changes
  useEffect(() => {
    setRevealed(false)
  }, [card.id])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' && !revealed) {
        e.preventDefault()
        setRevealed(true)
      }
      if (revealed) {
        if (e.key === '1') onAnswer('correct')
        if (e.key === '2') onAnswer('close')
        if (e.key === '3') onAnswer('wrong')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, onAnswer])

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      {/* Flip card */}
      <div className="flip-card-scene w-full">
        <div className={cn('flip-card-inner w-full', revealed && 'flipped')}>
          {/* Front face */}
          <div
            className="flip-card-face w-full rounded-2xl border border-stone-200 bg-white shadow-sm cursor-pointer select-none"
            onClick={() => !revealed && setRevealed(true)}
            style={{ minHeight: '220px' }}
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center" style={{ minHeight: '220px' }}>
              <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400 mb-4">
                Front
              </p>
              <p className="text-xl font-medium text-stone-900 leading-relaxed">{card.front}</p>
              {!revealed && (
                <p className="mt-6 text-xs text-stone-400">Click card or press Space to reveal</p>
              )}
            </div>
          </div>

          {/* Back face */}
          <div
            className="flip-card-face flip-card-back absolute inset-0 w-full rounded-2xl border border-stone-200 bg-white shadow-sm"
            style={{ minHeight: '220px' }}
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center" style={{ minHeight: '220px' }}>
              <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400 mb-4">
                Back
              </p>
              <p className="text-xl text-stone-700 leading-relaxed">{card.back}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grade buttons — only after reveal */}
      <div
        className={cn(
          'flex gap-3 w-full transition-opacity duration-200',
          revealed ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {gradeButtons.map(({ grade, label, key, className }) => (
          <button
            key={grade}
            onClick={() => onAnswer(grade)}
            className={cn(
              'flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-colors',
              className
            )}
          >
            {label}
            <span className="ml-1.5 text-xs font-normal opacity-50">{key}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
