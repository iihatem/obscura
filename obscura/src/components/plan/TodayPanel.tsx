'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { buttonClass } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { dayLabel, examLabel, nextReviewDay } from '@/lib/reviewPlan'
import { dayPlanFor, type PlannedSet } from '@/lib/examPlans'
import { useLocalToday } from '@/hooks/useLocalToday'
import { plural } from '@/lib/utils'

export interface TodayItem extends PlannedSet {
  set: { id: string; title: string; subject: string | null }
}

/** The library's list of planned sets and how many cards each has today. */
export default function TodayPanel({ items }: { items: TodayItem[] }) {
  const today = useLocalToday()
  if (!items.length) return null

  const rows = today
    ? items
        .map((item) => ({ item, day: dayPlanFor(item, today) }))
        // Sets with cards left first, then done ones, then past exams; soonest exam first.
        .sort((a, b) => rank(a.day) - rank(b.day) || a.item.plan.exam_date.localeCompare(b.item.plan.exam_date))
    : null
  const left = rows?.reduce((n, r) => n + (r.day.daysLeft >= 0 ? r.day.remaining.length : 0), 0) ?? 0

  return (
    <section aria-labelledby="today-heading" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="today-heading" className="text-[22px] font-bold text-ink">Today</h2>
        {rows && <p className="text-sm text-ink-muted">{left ? `${plural(left, 'card')} to review` : 'All done'}</p>}
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">We spread your reviews out so they stick.</p>

      <ul className="mt-3 divide-y divide-line">
        {rows
          ? rows.map(({ item, day }) => {
              const passed = day.daysLeft < 0
              const done = !passed && day.remaining.length === 0
              const next = nextReviewDay(day)
              const parts = [
                item.set.subject,
                passed
                  ? null
                  : done
                    ? day.planned.length ? 'Done for today' : 'Nothing today'
                    : `${plural(day.remaining.length, 'card')} ${day.doneToday ? 'left ' : ''}today`,
                done && next ? `${next.count} ${dayLabel(next.date, today!)}` : null,
                examLabel(item.plan.exam_date, today!),
              ].filter(Boolean)
              return (
                <li key={item.set.id} className="flex items-center gap-3 py-3 first:pt-2 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sets/${item.set.id}`} className="block truncate font-semibold text-ink hover:underline">
                      {item.set.title}
                    </Link>
                    <p className="text-sm text-ink-muted">{parts.join(' · ')}</p>
                  </div>
                  {passed ? (
                    <Link href={`/sets/${item.set.id}`} className={buttonClass('ghost', 'sm')}>Update plan</Link>
                  ) : done ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-good">
                      <Check className="h-4 w-4" aria-hidden />
                      Done
                    </span>
                  ) : (
                    <Link href={`/sets/${item.set.id}/study?plan=today`} className={buttonClass('primary', 'sm')} aria-label={`Study ${item.set.title}`}>
                      Study
                    </Link>
                  )}
                </li>
              )
            })
          : items.map((item) => (
              <li key={item.set.id} className="flex items-center gap-3 py-3 first:pt-2 last:pb-0" aria-busy>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{item.set.title}</p>
                  <Skeleton className="mt-1.5 h-3 w-44" />
                </div>
                <Skeleton className="h-8 w-16 rounded-full" />
              </li>
            ))}
      </ul>
    </section>
  )
}

function rank(day: { daysLeft: number; remaining: string[] }) {
  if (day.daysLeft < 0) return 2
  return day.remaining.length ? 0 : 1
}
