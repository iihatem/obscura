'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import { addDays, DEFAULT_CAP, examLabel, localDate, longDate, planToday, type GradeEvent } from '@/lib/reviewPlan'
import { isMissingTable, type ExamPlan } from '@/lib/examPlans'
import { clearExamPlan, saveExamPlan } from '@/lib/examPlansApi'
import { plural } from '@/lib/utils'

const CAPS = [15, 30, 50, 100]

interface ExamPlanDialogProps {
  open: boolean
  onClose: () => void
  setId: string
  cardIds: string[]
  history: GradeEvent[]
  /** The plan being changed, or null for a new one. */
  plan: ExamPlan | null
  today: string
  /** The saved plan, or null once it's removed. */
  onSaved: (plan: ExamPlan | null) => void
  save?: typeof saveExamPlan
  clear?: typeof clearExamPlan
}

export default function ExamPlanDialog(props: ExamPlanDialogProps) {
  // Remounting starts the form from the saved plan each time it opens.
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.plan ? 'Your exam plan' : 'Plan for an exam'} className="sm:max-w-md">
      {props.open && <PlanForm {...props} />}
    </Modal>
  )
}

function PlanForm({ onClose, setId, cardIds, history, plan, today, onSaved, save = saveExamPlan, clear = clearExamPlan }: ExamPlanDialogProps) {
  const { toast } = useToast()
  // A past exam date is kept only to show it; picking again starts from a week out.
  const [date, setDate] = useState(plan && plan.exam_date >= today ? plan.exam_date : addDays(today, 7))
  const [cap, setCap] = useState(plan?.daily_cap ?? DEFAULT_CAP)
  const [dateError, setDateError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'save' | 'clear' | null>(null)
  const caps = [...new Set([...CAPS, cap])].sort((a, b) => a - b)

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today
  const preview = valid && cardIds.length
    ? planToday({ cardIds, history, examDate: date, today, cap, startDate: plan ? localDate(plan.created_at) : today })
    : null

  async function handleSave() {
    if (!valid) { setDateError(date ? 'Pick today or a day after it.' : 'Pick the day of your exam.'); return }
    setBusy('save')
    setError('')
    try {
      const saved = await save(setId, date, cap, !!plan)
      onSaved(saved)
      toast(plan ? 'Plan updated' : 'Plan set')
    } catch (err) {
      setError(isMissingTable(err as { code?: string }) ? "Exam plans aren't switched on yet." : "Couldn't save the plan. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function handleClear() {
    setBusy('clear')
    setError('')
    try {
      await clear(setId)
      onSaved(null)
      toast('Plan removed')
    } catch {
      setError("Couldn't remove the plan. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-1 text-[15px] text-ink-muted">
        Pick the day of your exam. Each day you get a short list of cards, and we spread your reviews out so they stick.
      </p>

      <Input
        label="Exam date"
        type="date"
        value={date}
        min={today}
        onChange={(e) => { setDate(e.target.value); setDateError('') }}
        error={dateError || undefined}
        required
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Most cards a day</span>
        <SegmentedControl
          label="Most cards a day"
          value={String(cap)}
          onChange={(v) => setCap(Number(v))}
          options={caps.map((c) => ({ value: String(c), label: String(c) }))}
          className="w-full [&>button]:flex-1"
        />
      </div>

      {preview && (
        <div className="rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink" aria-live="polite">
          <p>
            <span className="font-semibold">
              {/* Count what's already been answered today, e.g. in a practice test. */}
              {preview.planned.length > 0 && preview.remaining.length === 0
                ? 'Done for today'
                : `Today: ${plural(preview.remaining.length, 'card')}${preview.doneToday > 0 ? ' left' : ''}`}
            </span>
            <span className="text-ink-muted"> · {examLabel(date, today)}, {longDate(date)}</span>
          </p>
          {preview.unseenAtExam > 0 && (
            <p className="mt-1.5 text-warn">
              At {cap} a day, {plural(preview.unseenAtExam, 'card')} won&apos;t come up before the exam. Pick a higher limit or a later date.
            </p>
          )}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{error}</p>}

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {plan ? (
          <Button variant="ghost" className="text-bad hover:bg-bad-soft hover:text-bad" loading={busy === 'clear'} disabled={!!busy} onClick={handleClear}>
            Remove plan
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose} disabled={!!busy}>Cancel</Button>
          <Button className="flex-1 sm:flex-none" loading={busy === 'save'} disabled={!!busy} onClick={handleSave}>
            {plan ? 'Save' : 'Set plan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
