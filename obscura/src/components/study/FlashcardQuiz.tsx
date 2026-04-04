'use client'

import { useState, useEffect } from 'react'
import type { FlashCard } from '@/types'
import type { Grade } from '@/lib/scoring'
import { cn } from '@/lib/utils'

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
    className: 'border-[#006972]/20 hover:border-[#006972] text-[#051125]',
  },
  {
    grade: 'close',
    label: 'Almost',
    key: '2',
    icon: 'help',
    className: 'border-[#e7e8e9] hover:border-[#75777d] text-[#051125]',
  },
  {
    grade: 'wrong',
    label: 'Need Review',
    key: '3',
    icon: 'emergency_home',
    className: 'border-[#ba1a1a]/20 hover:border-[#ba1a1a] text-[#051125]',
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
              className="flip-card-face w-full rounded-xl bg-white shadow-sm border border-[#e7e8e9] cursor-pointer select-none relative overflow-hidden"
              onClick={() => !revealed && setRevealed(true)}
              style={{ minHeight: '280px' }}
            >
              <div className="absolute top-4 left-4 bg-[#1b263b] text-[#828da7] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#006972] rounded-full animate-pulse" />
                Flashcard Mode
              </div>
              <div className="flex flex-col items-center justify-center h-full p-10 text-center" style={{ minHeight: '280px' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#006972] mb-4">Question</p>
                <p className="text-xl font-medium text-[#191c1d] leading-relaxed">{card.front}</p>
                {!revealed && (
                  <p className="mt-8 text-xs text-[#75777d]">Click card or press Space to reveal</p>
                )}
              </div>
            </div>

            {/* Back */}
            <div
              className="flip-card-face flip-card-back absolute inset-0 w-full rounded-xl bg-white shadow-sm border border-[#006972]/20"
              style={{ minHeight: '280px' }}
            >
              <div className="flex flex-col items-center justify-center h-full p-10 text-center" style={{ minHeight: '280px' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#006972] mb-4">Answer</p>
                <p className="text-xl text-[#191c1d] leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flip button */}
        {!revealed && (
          <button
            onClick={() => setRevealed(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#051125] text-white rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            Flip to See Answer
          </button>
        )}
      </div>

      {/* Right panel: Self Assessment */}
      <aside className="w-full lg:w-72 flex flex-col gap-6">
        <div className="bg-[#f3f4f5] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-[#051125] text-lg mb-1" style={{ fontFamily: 'var(--font-manrope)' }}>
              Self Assessment
            </h3>
            <p className="text-sm text-[#45474d] leading-relaxed">
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
                  'w-full flex items-center justify-between px-5 py-4 bg-white border rounded-lg transition-all group',
                  className
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'material-symbols-outlined text-[20px]',
                      grade === 'correct' ? 'text-[#006972]' : grade === 'wrong' ? 'text-[#ba1a1a]' : 'text-[#75777d]'
                    )}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                  <span className="font-bold text-[#051125]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#45474d] opacity-50">{key}</span>
                  <span className="material-symbols-outlined text-[#45474d] group-hover:translate-x-1 transition-transform text-[18px]">
                    chevron_right
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Insight */}
        <div className="rounded-xl overflow-hidden shadow-xl shadow-[#051125]/5">
          <div className="p-6 bg-[#1b263b] text-[#828da7] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006972]">psychology</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#828da7]/70">AI Curator Insight</span>
            </div>
            <p className="text-sm leading-relaxed">
              Focus on understanding the underlying concept before memorizing specific terms. Active recall strengthens retention.
            </p>
          </div>
          <div className="bg-[#051125] px-6 py-3 flex justify-between items-center">
            <span className="text-[10px] text-white/50 font-medium">Spaced Repetition Active</span>
            <div className="flex gap-1">
              <div className="w-8 h-1 bg-[#006972] rounded-full" />
              <div className="w-8 h-1 bg-[#828da7]/30 rounded-full" />
              <div className="w-8 h-1 bg-[#828da7]/30 rounded-full" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
