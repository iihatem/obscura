'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import type { Card, Set } from '@/types'
import StudySession from '@/components/study/StudySession'
import type { CardAnswer } from '@/components/study/ResultsSummary'
import { buttonClass } from '@/components/ui/Button'
import { dayPlanFor, type ExamPlan } from '@/lib/examPlans'
import type { GradeEvent } from '@/lib/reviewPlan'
import { useLocalToday } from '@/hooks/useLocalToday'
import { cn } from '@/lib/utils'
import DoneForToday from './DoneForToday'

interface TodayStudyProps {
  set: Set
  cards: Card[]
  plan: ExamPlan
  history: GradeEvent[]
}

/** Studies the cards on today's list in a set's exam plan. */
export default function TodayStudy({ set, cards, plan, history }: TodayStudyProps) {
  const today = useLocalToday()
  // Answers from this visit, which the server's history doesn't have yet.
  const [answered, setAnswered] = useState<GradeEvent[]>([])
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards])
  const day = today ? dayPlanFor({ plan, cardIds, history: [...history, ...answered] }, today) : null

  // The deck is fixed once the day is known, so finishing it (or midnight)
  // doesn't swap the cards out from under the session.
  const [deck, setDeck] = useState<Card[] | null>(null)
  if (day && !deck) {
    const byId = new Map(cards.map((c) => [c.id, c]))
    setDeck(day.remaining.map((id) => byId.get(id)!))
  }

  if (!today || !day || !deck) return <div className="min-h-dvh" aria-busy />

  const done = <DoneForToday plan={day} examDate={plan.exam_date} today={today} className="mt-6 rounded-3xl border border-line bg-surface p-6" />

  if (!deck.length) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link href={`/sets/${set.id}`} className="flex w-fit items-center gap-1.5 rounded-full py-2 text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {set.title}
        </Link>
        {day.planned.length ? done : (
          <section className="mt-6 rounded-3xl border border-line bg-surface p-6">
            <h2 className="font-headline text-lg font-bold text-ink">Nothing to review today</h2>
            <p className="mt-1 text-[15px] text-ink-muted">Your next cards come up on their own day. You can still study the whole set.</p>
          </section>
        )}
        <Link href={`/sets/${set.id}/study`} className={cn(buttonClass('secondary', 'lg'), 'mt-4')}>
          <Layers className="h-4 w-4" aria-hidden />
          Study the whole set
        </Link>
      </div>
    )
  }

  function onFinish(answers: CardAnswer[]) {
    const at = new Date().toISOString()
    setAnswered((prev) => [...prev, ...answers.map((a) => ({ cardId: a.card.id, grade: a.grade, at }))])
  }

  return (
    <StudySession
      set={set}
      cards={deck}
      plan={{
        progressKey: `${set.id}:today`,
        onFinish,
        done: day.remaining.length ? null : done,
      }}
    />
  )
}
