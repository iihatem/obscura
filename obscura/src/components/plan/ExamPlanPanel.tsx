'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarClock, CalendarCheck, Pencil, Play } from 'lucide-react'
import Button, { buttonClass } from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import ProgressBar from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { examLabel, longDate, shortDate, type GradeEvent } from '@/lib/reviewPlan'
import { dayPlanFor, type ExamPlan } from '@/lib/examPlans'
import { useLocalToday } from '@/hooks/useLocalToday'
import { cn, plural } from '@/lib/utils'
import ExamPlanDialog from './ExamPlanDialog'
import { nextLine } from './DoneForToday'

interface ExamPlanPanelProps {
  setId: string
  cardIds: string[]
  history: GradeEvent[]
  plan: ExamPlan | null
}

const box = 'mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5'

/** The set page's exam plan: set one up, or see today's cards and study them. */
export default function ExamPlanPanel({ setId, cardIds, history, plan: initialPlan }: ExamPlanPanelProps) {
  const today = useLocalToday()
  const [plan, setPlan] = useState(initialPlan)
  const [open, setOpen] = useState(false)

  if (!cardIds.length) return null

  if (!today) {
    return (
      <div className={box} aria-busy>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    )
  }

  const dialog = (
    <ExamPlanDialog
      open={open}
      onClose={() => setOpen(false)}
      setId={setId}
      cardIds={cardIds}
      history={history}
      plan={plan}
      today={today}
      onSaved={(p) => { setPlan(p); setOpen(false) }}
    />
  )

  if (!plan) {
    return (
      <section className={box} aria-label="Exam plan">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Icon><CalendarClock className="h-5 w-5" aria-hidden /></Icon>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Have an exam coming up?</p>
            <p className="text-sm text-ink-muted">Set the date and get a short list each day. We spread your reviews out so they stick.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Plan for an exam
        </Button>
        {dialog}
      </section>
    )
  }

  const day = dayPlanFor({ plan, cardIds, history }, today)

  if (day.daysLeft < 0) {
    return (
      <section className={box} aria-label="Exam plan">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Icon><CalendarCheck className="h-5 w-5" aria-hidden /></Icon>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Your exam was {shortDate(plan.exam_date)}</p>
            <p className="text-sm text-ink-muted">Another one coming up? Set a new date, or remove the plan.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">Set a new date</Button>
        {dialog}
      </section>
    )
  }

  const done = day.planned.length > 0 && day.remaining.length === 0
  const title = done
    ? 'Done for today'
    : day.planned.length === 0
      ? 'Nothing to review today'
      : `Today: ${plural(day.remaining.length, 'card')}${day.doneToday ? ' left' : ''}`

  return (
    <section className={cn(box, 'relative')} aria-label="Exam plan">
      <div className="flex min-w-0 flex-1 items-start gap-3 pr-12 sm:pr-0">
        <Icon tone={done ? 'good' : 'accent'}>
          {done ? <CalendarCheck className="h-5 w-5" aria-hidden /> : <CalendarClock className="h-5 w-5" aria-hidden />}
        </Icon>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-muted">
            {examLabel(plan.exam_date, today)}, {longDate(plan.exam_date)} · {day.learned} of {day.total} learned
          </p>
          {(done || day.planned.length === 0) && <p className="mt-0.5 text-sm text-ink">{nextLine(day, today)}</p>}
          {!done && day.doneToday > 0 && (
            <ProgressBar value={day.doneToday / day.planned.length} label="Today's cards done" className="mt-2 max-w-60" />
          )}
          {day.unseenAtExam > 0 && (
            <p className="mt-1 text-sm text-warn">
              At {plan.daily_cap} a day, {plural(day.unseenAtExam, 'card')} won&apos;t come up before the exam.
            </p>
          )}
        </div>
      </div>
      {day.remaining.length > 0 && (
        <Link href={`/sets/${setId}/study?plan=today`} className={cn(buttonClass('primary', 'md'), 'w-full sm:w-auto')}>
          <Play className="h-4 w-4" aria-hidden />
          {day.doneToday > 0 ? 'Keep going' : 'Study today’s cards'}
        </Link>
      )}
      {/* Top right on phones, after the Study button on wider screens. */}
      <IconButton label="Change the exam plan" variant="outline" onClick={() => setOpen(true)} className="absolute right-4 top-4 sm:static">
        <Pencil className="h-4 w-4" aria-hidden />
      </IconButton>
      {dialog}
    </section>
  )
}

function Icon({ children, tone = 'accent' }: { children: React.ReactNode; tone?: 'accent' | 'good' }) {
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone === 'good' ? 'bg-good-soft text-good' : 'bg-accent-soft text-accent-ink')}>
      {children}
    </span>
  )
}
