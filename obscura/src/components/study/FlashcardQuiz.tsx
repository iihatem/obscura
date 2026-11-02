'use client'

import { useState, useEffect } from 'react'
import type { FlashCard } from '@/types'
import type { Grade } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

interface FlashcardQuizProps {
  card: FlashCard
  onAnswer: (grade: Grade) => void
}

const gradeButtons: { grade: Grade; label: string; key: string; icon: string; className: string }[] = [
  {
    grade: 'correct',
    label: 'Confident',
    key: '1',
    icon: 'verified',
    className: 'border-accent/20 hover:border-accent text-ink',
  },
  {
    grade: 'close',
    label: 'Almost',
    key: '2',
    icon: 'help',
    className: 'border-line hover:border-ink-muted text-ink',
  },
  {
    grade: 'wrong',
    label: 'Need Review',
    key: '3',
    icon: 'emergency_home',
    className: 'border-bad/20 hover:border-bad text-ink',
  },
]

export default function FlashcardQuiz({ card, onAnswer }: FlashcardQuizProps) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
  }, [card.id])

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
    <div className="flex flex-col gap-12 lg:flex-row lg:gap-8 w-full max-w-5xl mx-auto items-start">

      {/* Main card area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Flip card */}
        <div className="flip-card-scene w-full">
          <div className={cn('flip-card-inner w-full', revealed && 'flipped')}>
            {/* Front */}
            <div
              className="flip-card-face w-full rounded-xl bg-surface shadow-sm border border-line cursor-pointer select-none relative overflow-hidden"
              onClick={() => !revealed && setRevealed(true)}
              style={{ minHeight: '280px' }}
            >
              <div className="absolute top-4 left-4 bg-ink text-ink-muted px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                Flashcard Mode
              </div>
              <div className="flex flex-col items-center justify-center h-full p-10 text-center" style={{ minHeight: '280px' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent mb-4">Question</p>
                <p className="text-xl font-medium text-ink leading-relaxed">{card.front}</p>
                {!revealed && (
                  <p className="mt-8 text-xs text-ink-muted">Click card or press Space to reveal</p>
                )}
              </div>
            </div>

            {/* Back */}
            <div
              className="flip-card-face flip-card-back absolute inset-0 w-full rounded-xl bg-surface shadow-sm border border-accent/20"
              style={{ minHeight: '280px' }}
            >
              <div className="flex flex-col items-center justify-center h-full p-10 text-center" style={{ minHeight: '280px' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent mb-4">Answer</p>
                <p className="text-xl text-ink leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flip button */}
        {!revealed && (
          <button
            onClick={() => setRevealed(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-on-ink rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Icon name="sync" size={14} />
            Flip to See Answer
          </button>
        )}
      </div>

      {/* Right panel: Self Assessment */}
      <aside className="w-full lg:w-72 flex flex-col gap-6">
        <div className="bg-paper rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-headline font-bold text-ink text-lg mb-1">
              Self Assessment
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              How comfortable do you feel with this card?
            </p>
          </div>
          <div
            className={cn(
              'flex flex-col gap-3 transition-opacity duration-200',
              revealed ? 'opacity-100' : 'opacity-40 pointer-events-none'
            )}
          >
            {gradeButtons.map(({ grade, label, key, icon, className }) => (
              <button
                key={grade}
                onClick={() => onAnswer(grade)}
                className={cn(
                  'w-full flex items-center justify-between px-5 py-4 bg-surface border rounded-lg transition-all group',
                  className
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={icon}
                    size={20}
                    className={grade === 'correct' ? 'text-accent' : grade === 'wrong' ? 'text-bad' : 'text-ink-muted'}
                  />
                  <span className="font-bold text-ink">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted opacity-50">{key}</span>
                  <Icon name="chevron_right" size={18} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Insight */}
        <div className="rounded-xl overflow-hidden shadow-xl shadow-ink/5">
          <div className="p-6 bg-ink text-ink-muted flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="psychology" size={20} className="text-accent" />
              <span className="text-xs font-bold uppercase tracking-widest text-ink-muted/70">AI Curator Insight</span>
            </div>
            <p className="text-sm leading-relaxed">
              Focus on understanding the underlying concept before memorizing specific terms. Active recall strengthens retention.
            </p>
          </div>
          <div className="bg-ink px-6 py-3 flex justify-between items-center">
            <span className="text-[10px] text-on-ink/50 font-medium">Spaced Repetition Active</span>
            <div className="flex gap-1">
              <div className="w-8 h-1 bg-accent rounded-full" />
              <div className="w-8 h-1 bg-ink-muted/30 rounded-full" />
              <div className="w-8 h-1 bg-ink-muted/30 rounded-full" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
