import { CalendarCheck } from 'lucide-react'
import { dayLabel, examLabel, nextReviewDay, type DayPlan } from '@/lib/reviewPlan'
import { plural } from '@/lib/utils'

/** What comes next once today's cards are done. */
export function nextLine(plan: DayPlan, today: string): string {
  if (plan.daysLeft <= 0) return 'Nothing more to review before the exam.'
  const next = nextReviewDay(plan)
  if (!next) return 'Nothing more to review before the exam.'
  return `Next: ${plural(next.count, 'card')} ${dayLabel(next.date, today)}.`
}

interface DoneForTodayProps {
  plan: DayPlan
  examDate: string
  today: string
  className?: string
}

/** "Done for today", what's next, and how far along the set is. */
export default function DoneForToday({ plan, examDate, today, className }: DoneForTodayProps) {
  return (
    <section className={className} aria-label="Done for today">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good">
          <CalendarCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-headline text-lg font-bold text-ink">Done for today</h2>
          <p className="mt-0.5 text-[15px] text-ink">{nextLine(plan, today)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {examLabel(examDate, today)} · {plan.learned} of {plural(plan.total, 'card')} learned
          </p>
        </div>
      </div>
    </section>
  )
}
