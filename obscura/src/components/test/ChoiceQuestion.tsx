'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { FlashCard } from '@/types'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { AnswerBar, QuestionCard } from './QuestionCard'

interface ChoiceQuestionProps {
  card: FlashCard
  options: string[]
  onSubmit: (chosen: number | null) => void
}

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * Pick one of four answers, change your mind if you like, then move on.
 * Keys 1–4 pick and Enter moves on; skipping takes the button.
 */
export default function ChoiceQuestion({ card, options, onSubmit }: ChoiceQuestionProps) {
  const [chosen, setChosen] = useState<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) {
        e.preventDefault()
        setChosen(n - 1)
      } else if (e.key === 'Enter' && chosen !== null && !(e.target instanceof HTMLButtonElement) && !e.repeat) {
        e.preventDefault()
        onSubmit(chosen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chosen, options.length, onSubmit])

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
        <div className="w-full max-w-xl">
          <QuestionCard label="Pick one">{card.front}</QuestionCard>
        </div>
        <div role="radiogroup" aria-label="Answers" className="grid w-full max-w-xl gap-2">
          {options.map((o, i) => {
            const selected = chosen === i
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChosen(i)}
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99]',
                  selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-ink-muted'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                    selected ? 'bg-accent text-surface' : 'bg-paper-2 text-ink-muted'
                  )}
                >
                  {LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5 text-[15px] leading-relaxed text-ink">{o}</span>
                <kbd aria-hidden className="mt-1 hidden text-[11px] font-medium text-ink-muted sm:block">{i + 1}</kbd>
              </button>
            )
          })}
        </div>
      </div>
      <AnswerBar>
        <Button size="lg" className="w-full" onClick={() => onSubmit(chosen)}>
          {chosen === null ? 'Skip' : 'Next'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </AnswerBar>
    </div>
  )
}
