'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { FlashCard } from '@/types'
import { isShortAnswer } from '@/lib/study'
import Button from '@/components/ui/Button'
import { AnswerBar, QuestionCard } from './QuestionCard'

const fieldClass =
  'min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20'

/**
 * Type the answer from memory. Nothing is marked until the end. Long answers
 * get a bigger box, since the student will compare them by eye later.
 */
export default function TypedQuestion({ card, onSubmit }: { card: FlashCard; onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  const long = !isShortAnswer(card.back)
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => {
    // Phones raise the keyboard on focus; only do it for keyboards we know are there.
    if (window.matchMedia('(pointer: fine)').matches) field.current?.focus()
  }, [])

  // Enter on an empty box does nothing, so a double press can't skip the next
  // question. Skipping takes the button.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    if (!draft.trim()) {
      e.preventDefault()
      return
    }
    // In the long box Shift+Enter starts a new line; Enter moves on, like the short box.
    if (long && !e.shiftKey) {
      e.preventDefault()
      onSubmit(draft)
    }
  }

  const common = {
    value: draft,
    onKeyDown,
    'aria-label': 'Your answer',
    placeholder: 'Type your answer',
    autoComplete: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl">
          <QuestionCard label="Question">{card.front}</QuestionCard>
        </div>
      </div>
      <AnswerBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); onSubmit(draft) }}>
          {long ? (
            <textarea
              {...common}
              ref={field}
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              className={`${fieldClass} resize-none py-3 leading-relaxed`}
            />
          ) : (
            <input {...common} ref={field} enterKeyHint="next" onChange={(e) => setDraft(e.target.value)} className={`${fieldClass} h-12`} />
          )}
          <Button type="submit" size="lg">
            {draft.trim() ? 'Next' : 'Skip'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </form>
        {long && <p className="mt-2 text-center text-xs text-ink-muted">Shift+Enter for a new line. You&apos;ll mark long answers yourself at the end.</p>}
      </AnswerBar>
    </div>
  )
}
