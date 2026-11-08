'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Timer, X } from 'lucide-react'
import type { Card, Set } from '@/types'
import type { Grade } from '@/lib/scoring'
import {
  blankResponse,
  buildTest,
  cardsToStudy,
  defaultCount,
  defaultKinds,
  gradeResponse,
  needsSelfGrade,
  resolveCount,
  testPool,
  type QuestionResult,
  type TestQuestion,
  type TestResponse,
} from '@/lib/practiceTest'
import Button, { buttonClass } from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ProgressBar from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import DiagramQuiz from '@/components/study/DiagramQuiz'
import StudySession from '@/components/study/StudySession'
import TestSetup, { effectiveCount, timerMinutes, type SetupChoice } from './TestSetup'
import TypedQuestion from './TypedQuestion'
import ChoiceQuestion from './ChoiceQuestion'
import SelfCheck from './SelfCheck'
import TestResults from './TestResults'

type Phase = 'setup' | 'testing' | 'check' | 'results' | 'study'

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface PracticeTestProps {
  set: Set
  cards: Card[]
}

/**
 * A practice test: pick the question types, answer one question a screen with
 * nothing marked, then see the score, a split by lecture page, and every miss
 * beside the right answer.
 */
export default function PracticeTest({ set, cards }: PracticeTestProps) {
  const router = useRouter()
  const [choice, setChoice] = useState<SetupChoice>(() => {
    const kinds = defaultKinds(cards)
    return { kinds, count: defaultCount(testPool(cards, kinds).length), pace: 'off' }
  })
  const [phase, setPhase] = useState<Phase>('setup')
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [results, setResults] = useState<QuestionResult[]>([])
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [studyCards, setStudyCards] = useState<Card[]>([])
  // The question already answered. A double press can submit twice before
  // re-render; both calls would see the same state and skip a question.
  const answered = useRef(-1)

  const index = results.length

  function start() {
    const pool = testPool(cards, choice.kinds).length
    const count = effectiveCount(choice, pool)
    const qs = buildTest(cards, { count, kinds: choice.kinds })
    const minutes = timerMinutes(choice, resolveCount(count, pool))
    answered.current = -1
    setQuestions(qs)
    setResults([])
    setTimedOut(false)
    setNow(Date.now())
    setEndsAt(minutes ? Date.now() + minutes * 60_000 : null)
    setPhase('testing')
    window.scrollTo(0, 0)
  }

  const finish = useCallback((done: QuestionResult[], outOfTime: boolean) => {
    // Anything not reached counts as unanswered.
    const all = [...done, ...questions.slice(done.length).map((q) => gradeResponse(q, blankResponse(q)))]
    setResults(all)
    setTimedOut(outOfTime)
    setEndsAt(null)
    setPhase(needsSelfGrade(all).length ? 'check' : 'results')
    window.scrollTo(0, 0)
  }, [questions])

  function answer(response: TestResponse) {
    if (answered.current === index) return
    answered.current = index
    const next = [...results, gradeResponse(questions[index], response)]
    if (next.length >= questions.length) finish(next, false)
    else {
      setResults(next)
      window.scrollTo(0, 0)
    }
  }

  // The clock: tick each second, and hand in the test when it runs out.
  const latest = useRef({ results, finish })
  useEffect(() => {
    latest.current = { results, finish }
  })
  useEffect(() => {
    if (phase !== 'testing' || endsAt === null) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) latest.current.finish(latest.current.results, true)
    }, 1000)
    return () => clearInterval(id)
  }, [phase, endsAt])

  function applyMarks(marks: Map<number, Grade>) {
    setResults((prev) => prev.map((r, i) => (marks.has(i) ? { ...r, grade: marks.get(i)! } : r)))
    setPhase('results')
    window.scrollTo(0, 0)
  }

  function studyMissed() {
    setStudyCards(cardsToStudy(results))
    setPhase('study')
    window.scrollTo(0, 0)
  }

  function leave() {
    if (results.length > 0) setConfirmLeave(true)
    else router.push(`/sets/${set.id}`)
  }

  if (!testPool(cards, { typed: true, diagram: true, choice: true }).length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" aria-hidden />}
          heading="Nothing to test yet"
          subtext="This set has no flashcards or labeled diagrams. Add some, then come back."
          action={{ label: 'Back to the set', href: `/sets/${set.id}` }}
        />
      </div>
    )
  }

  if (phase === 'setup') return <TestSetup set={set} cards={cards} choice={choice} onChange={setChoice} onStart={start} />

  if (phase === 'check') return <SelfCheck results={results} pending={needsSelfGrade(results)} timedOut={timedOut} onDone={applyMarks} />

  if (phase === 'results') {
    return (
      <TestResults
        set={set}
        results={results}
        timedOut={timedOut}
        onStudyMissed={studyMissed}
        onRetake={start}
        onChangeSettings={() => setPhase('setup')}
      />
    )
  }

  if (phase === 'study') return <StudySession set={set} cards={studyCards} />

  const q = questions[index]
  if (!q) return <div className="min-h-dvh" aria-busy />
  const left = endsAt === null ? null : endsAt - now

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 px-3 pb-3 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={leave}
            aria-label="Leave the test"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 truncate text-[13px] font-medium text-ink-muted">Practice test · {set.title}</p>
            <ProgressBar value={index / questions.length} label="Test progress" />
          </div>
          {left !== null && (
            <span
              role="timer"
              aria-label="Time left"
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold tabular-nums',
                left < 60_000 ? 'border-warn/40 bg-warn-soft text-warn' : 'border-line text-ink'
              )}
            >
              <Timer className="h-4 w-4" aria-hidden />
              {clock(left)}
            </span>
          )}
          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
            {index + 1}<span className="font-normal text-ink-muted"> / {questions.length}</span>
          </span>
        </div>
      </header>

      {q.kind === 'typed' && <TypedQuestion key={index} card={q.card} onSubmit={(text) => answer({ kind: 'typed', text })} />}
      {q.kind === 'choice' && <ChoiceQuestion key={index} card={q.card} options={q.options} onSubmit={(chosen) => answer({ kind: 'choice', chosen })} />}
      {q.kind === 'diagram' && <DiagramQuiz key={index} card={q.card} onSubmitAnswers={(labels) => answer({ kind: 'diagram', labels })} />}

      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Leave this test?" description={`You've answered ${index} of ${questions.length}. Your answers won't be kept.`}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href={`/sets/${set.id}`} className={buttonClass('secondary', 'md')}>Leave</Link>
          <Button onClick={() => setConfirmLeave(false)}>Keep going</Button>
        </div>
      </Modal>
    </div>
  )
}
