'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Image as ImageIcon, Layers, Shuffle, X } from 'lucide-react'
import type { Set, Card, FlashCard as FlashCardType, DiagramCard as DiagramCardType } from '@/types'
import type { Grade } from '@/lib/scoring'
import FlashcardQuiz from './FlashcardQuiz'
import DiagramQuiz from './DiagramQuiz'
import ResultsSummary, { type CardAnswer } from './ResultsSummary'
import { apiFetch, withColdStartRetry } from '@/lib/api'
import Modal from '@/components/ui/Modal'
import Button, { buttonClass } from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'

type StudyMode = 'flashcard' | 'diagram' | 'mixed'
type Phase = 'picking' | 'studying' | 'results'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function detectMode(cards: Card[]): StudyMode {
  const hasFlash = cards.some((c) => c.type === 'flashcard')
  const hasDiag = cards.some((c) => c.type === 'diagram')
  if (hasFlash && hasDiag) return 'mixed'
  return hasDiag ? 'diagram' : 'flashcard'
}

interface StudySessionProps {
  set: Set
  cards: Card[]
}

export default function StudySession({ set, cards }: StudySessionProps) {
  const router = useRouter()
  const flashcards = cards.filter((c): c is FlashCardType => c.type === 'flashcard')
  const diagrams = cards.filter((c): c is DiagramCardType => c.type === 'diagram')
  // With only one kind of card there's nothing to choose — go straight in.
  const onlyMode: StudyMode | null = cards.length && (!flashcards.length || !diagrams.length) ? detectMode(cards) : null

  const [phase, setPhase] = useState<Phase>(onlyMode ? 'studying' : 'picking')
  const sessionRef = useRef<Promise<string | null> | null>(null)
  // The index of the card already graded. A double press or key auto-repeat
  // can call handleAnswer twice before re-render; both calls would see the
  // same state, skip a card and drop an answer.
  const gradedIndex = useRef(-1)
  const [resultsSaved, setResultsSaved] = useState(true)
  const [deck, setDeck] = useState<Card[]>(() => (onlyMode ? shuffle(cards) : []))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<CardAnswer[]>([])
  // When the current card appeared; a ref, since it never affects what's drawn.
  const cardShownAt = useRef(0)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const startRecord = useCallback((mode: StudyMode) => {
    // The cards are already here — don't make studying wait on the API, which
    // may be cold-starting. The session record is created alongside, and the
    // results submission waits for it at the end.
    sessionRef.current = withColdStartRetry(() =>
      apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ set_id: set.id, mode }) })
    )
      .then(async (res) => (res.ok ? ((await res.json()).id as string) : null))
      .catch(() => null)
  }, [set.id])

  // Time each card from when it's on screen.
  useEffect(() => {
    if (phase === 'studying') cardShownAt.current = Date.now()
  }, [phase, deck])

  // A session that started without the picker still needs its record.
  const started = useRef(false)
  useEffect(() => {
    if (onlyMode && !started.current) {
      started.current = true
      startRecord(onlyMode)
    }
  }, [onlyMode, startRecord])

  function beginStudy(mode: StudyMode, cardList: Card[]) {
    setResultsSaved(true)
    startRecord(mode)
    gradedIndex.current = -1
    setDeck(shuffle(cardList))
    setCurrentIndex(0)
    setAnswers([])
    cardShownAt.current = 0
    setPhase('studying')
    window.scrollTo(0, 0)
  }

  async function handleAnswer(grade: Grade, labelGrades?: Grade[]) {
      if (gradedIndex.current === currentIndex) return
      gradedIndex.current = currentIndex
      const card = deck[currentIndex]
      const answer: CardAnswer = { card, grade, time_taken_ms: cardShownAt.current ? Date.now() - cardShownAt.current : 0, labelGrades }
      const newAnswers = [...answers, answer]
      setAnswers(newAnswers)

      if (currentIndex + 1 >= deck.length) {
        // Show the score straight away; recording it is best-effort.
        setPhase('results')
        window.scrollTo(0, 0)
        const sessionId = await sessionRef.current
        let ok = false
        if (sessionId) {
          try {
            const res = await withColdStartRetry(() =>
              apiFetch('/results', {
                method: 'POST',
                body: JSON.stringify({
                  session_id: sessionId,
                  results: newAnswers.map((a) => ({ card_id: a.card.id, grade: a.grade, time_taken_ms: a.time_taken_ms })),
                }),
              })
            )
            ok = res.ok
          } catch {
            ok = false
          }
        }
        setResultsSaved(ok)
      } else {
        setCurrentIndex((i) => i + 1)
        cardShownAt.current = Date.now()
        window.scrollTo(0, 0)
      }
  }

  function leave() {
    if (phase === 'studying' && answers.length > 0) setConfirmLeave(true)
    else router.push(`/sets/${set.id}`)
  }

  if (!cards.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon={<Layers className="h-6 w-6" aria-hidden />}
          heading="Nothing to study yet"
          subtext="This set has no cards. Add some from a lecture or by hand, then come back."
          action={{ label: 'Back to the set', href: `/sets/${set.id}` }}
        />
      </div>
    )
  }

  if (phase === 'picking') {
    const options: { mode: StudyMode; title: string; detail: string; count: number; icon: React.ReactNode }[] = [
      { mode: 'mixed', title: 'Everything', detail: 'Flashcards and diagrams, shuffled together', count: cards.length, icon: <Shuffle className="h-5 w-5" aria-hidden /> },
      { mode: 'flashcard', title: 'Flashcards', detail: 'Read the question, answer in your head, flip', count: flashcards.length, icon: <Layers className="h-5 w-5" aria-hidden /> },
      { mode: 'diagram', title: 'Diagrams', detail: 'Name every covered label', count: diagrams.length, icon: <ImageIcon className="h-5 w-5" aria-hidden /> },
    ]
    return (
      <div className="mx-auto max-w-lg px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link href={`/sets/${set.id}`} className="flex w-fit items-center gap-1.5 rounded-full py-2 text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {set.title}
        </Link>
        <h1 className="mt-6 text-[28px] font-extrabold text-ink">What do you want to study?</h1>
        <div className="mt-6 flex flex-col gap-3">
          {options.map((o) => (
            <button
              key={o.mode}
              type="button"
              onClick={() => beginStudy(o.mode, o.mode === 'flashcard' ? flashcards : o.mode === 'diagram' ? diagrams : cards)}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-accent active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">{o.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-headline text-lg font-bold text-ink">{o.title}</span>
                <span className="block text-sm text-ink-muted">{o.detail}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-muted">{o.count}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    return (
      <ResultsSummary
        set={set}
        answers={answers}
        saved={resultsSaved}
        onReview={(missed) => beginStudy(detectMode(missed), missed)}
        onStudyAgain={() => (onlyMode ? beginStudy(onlyMode, cards) : setPhase('picking'))}
      />
    )
  }

  const currentCard = deck[currentIndex]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 px-3 pb-3 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={leave}
            aria-label="Leave the session"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 truncate text-[13px] font-medium text-ink-muted">{set.title}</p>
            <ProgressBar value={currentIndex / deck.length} label="Session progress" />
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
            {currentIndex + 1}<span className="font-normal text-ink-muted"> / {deck.length}</span>
          </span>
        </div>
      </header>

      {currentCard.type === 'flashcard' ? (
        <FlashcardQuiz key={`${currentCard.id}-${currentIndex}`} card={currentCard} onAnswer={handleAnswer} />
      ) : (
        <DiagramQuiz key={`${currentCard.id}-${currentIndex}`} card={currentCard} onAnswer={handleAnswer} />
      )}

      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Leave this session?" description={`You've answered ${answers.length} of ${deck.length}. Leaving now won't save this session to your history.`}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href={`/sets/${set.id}`} className={buttonClass('secondary', 'md')}>Leave</Link>
          <Button onClick={() => setConfirmLeave(false)}>Keep studying</Button>
        </div>
      </Modal>
    </div>
  )
}
