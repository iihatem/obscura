'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { gradeAnswer, type Grade } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

export interface CoverLabel { label: string; x: number; y: number; width: number; height: number }

const graded: Record<Grade, string> = {
  correct: 'border-good bg-good-soft text-good',
  close: 'border-warn bg-warn-soft text-warn',
  wrong: 'border-bad bg-bad-soft text-bad',
  empty: 'border-bad bg-bad-soft text-bad',
}

/**
 * A diagram with every label covered. In "quiz" mode you name each box in one
 * field below and it's graded the way study sessions grade; in "reveal" mode a
 * tap uncovers a label.
 */
export default function CoveredDiagram({ image, labels, mode = 'quiz', onFinish }: {
  image: ReactNode
  labels: readonly CoverLabel[]
  mode?: 'quiz' | 'reveal'
  onFinish?: (grades: Grade[]) => void
}) {
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [grades, setGrades] = useState<(Grade | null)[]>(() => labels.map(() => null))
  const [typed, setTyped] = useState<string[]>(() => labels.map(() => ''))
  const [feedback, setFeedback] = useState<{ grade: Grade; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const done = grades.every((g) => g !== null)

  function pick(i: number) {
    if (mode === 'reveal') {
      setGrades((g) => g.map((x, k) => (k === i ? (x ? null : 'correct') : x)))
      return
    }
    if (grades[i]) return
    setCurrent(i)
    input.current?.focus()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!answer.trim()) { setFeedback({ grade: 'empty', text: 'Type an answer first.' }); return }
    const g = gradeAnswer(answer, labels[current].label)
    const nextGrades = grades.map((x, k) => (k === current ? g : x))
    setGrades(nextGrades)
    setTyped((t) => t.map((x, k) => (k === current ? answer.trim() : x)))
    setFeedback({
      grade: g,
      text: g === 'correct' ? 'Correct.' : g === 'close' ? `Almost: it's “${labels[current].label}”.` : `Not quite: it's “${labels[current].label}”.`,
    })
    setAnswer('')
    const next = nextGrades.findIndex((x) => x === null)
    if (next === -1) onFinish?.(nextGrades as Grade[])
    else setCurrent(next)
  }

  function reset() {
    setGrades(labels.map(() => null))
    setTyped(labels.map(() => ''))
    setFeedback(null)
    setCurrent(0)
  }

  const correct = grades.filter((g) => g === 'correct').length
  const close = grades.filter((g) => g === 'close').length

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full overflow-hidden rounded-2xl border border-line">
        {image}
        {labels.map((l, i) => {
          const g = grades[i]
          const active = mode === 'quiz' && !g && i === current
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              aria-label={g ? `Label ${i + 1}: ${l.label}` : `Label ${i + 1}, covered`}
              aria-pressed={active}
              className={cn(
                'absolute flex items-center justify-center overflow-hidden rounded-[4px] border-2 px-1 text-[clamp(9px,1.6vw,13px)] font-semibold leading-tight transition-colors',
                g ? graded[g] : active ? 'z-10 border-accent bg-cover text-on-cover ring-4 ring-accent/30' : 'border-cover bg-cover text-on-cover/70'
              )}
              style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.width}%`, height: `${l.height}%` }}
            >
              <span className="truncate">{g ? (g === 'correct' || mode === 'reveal' ? l.label : typed[i] || l.label) : i + 1}</span>
            </button>
          )
        })}
      </div>

      {mode === 'quiz' && (done ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-headline text-lg font-bold text-ink">
            {correct} of {labels.length} right{close ? `, ${close} almost` : ''}
          </p>
          <Button variant="secondary" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="flex gap-2">
            <input
              ref={input}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label={`Name label ${current + 1}`}
              placeholder={`Name label ${current + 1}`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
            />
            <Button type="submit" size="lg">
              <Check className="h-4 w-4" aria-hidden />
              Check
            </Button>
          </form>
          <p aria-live="polite" className={cn('min-h-5 text-sm', !feedback ? 'text-ink-muted' : feedback.grade === 'correct' ? 'text-good' : feedback.grade === 'close' ? 'text-warn' : 'text-bad')}>
            {feedback?.text ?? 'Tap any covered box to pick it, or just start typing.'}
          </p>
        </>
      ))}
    </div>
  )
}
