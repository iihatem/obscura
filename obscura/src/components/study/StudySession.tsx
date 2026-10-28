'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Set, Card, FlashCard as FlashCardType, DiagramCard as DiagramCardType } from '@/types'
import type { Grade } from '@/lib/scoring'
import FlashcardQuiz from './FlashcardQuiz'
import DiagramQuiz from './DiagramQuiz'
import ResultsSummary from './ResultsSummary'
import { cn } from '@/lib/utils'
import { apiFetch, withColdStartRetry } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StudyMode = 'flashcard' | 'diagram' | 'mixed'
type Phase = 'picking' | 'studying' | 'results'

interface CardAnswer {
  card: Card
  grade: Grade
  time_taken_ms: number
  labelGrades?: Grade[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Mode picker
// ---------------------------------------------------------------------------

interface ModeOption {
  mode: StudyMode
  label: string
  description: string
  count: number
  icon: React.ReactNode
  disabled: boolean
}

const FlashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
    <line x1="12" y1="12" x2="12" y2="18" />
  </svg>
)

const DiagramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const MixedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
  </svg>
)

function ModePicker({
  options,
  onSelect,
  loading,
}: {
  options: ModeOption[]
  onSelect: (mode: StudyMode) => void
  loading: StudyMode | null
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <button
          key={opt.mode}
          disabled={opt.disabled || loading !== null}
          onClick={() => onSelect(opt.mode)}
          className={cn(
            'flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all',
            opt.disabled
              ? 'cursor-not-allowed border-[#e1e3e4] bg-[#f3f4f5] opacity-50'
              : loading === opt.mode
              ? 'border-[#051125] bg-[#051125]'
              : 'border-[#e7e8e9] bg-white hover:border-[#006972]/40 hover:shadow-sm'
          )}
        >
          <span
            className={cn(
              'shrink-0',
              loading === opt.mode ? 'text-white' : opt.disabled ? 'text-[#c5c6cd]' : 'text-[#006972]'
            )}
          >
            {opt.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-bold',
                loading === opt.mode ? 'text-white' : 'text-[#051125]'
              )}
              style={{ fontFamily: 'var(--font-manrope)' }}
            >
              {opt.label}
            </p>
            <p
              className={cn(
                'text-xs',
                loading === opt.mode ? 'text-[#c1c6d6]' : 'text-[#45474d]'
              )}
            >
              {opt.description}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold',
              loading === opt.mode
                ? 'bg-white/20 text-white'
                : 'bg-[#edeeef] text-[#45474d]'
            )}
          >
            {opt.count}
          </span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main StudySession
// ---------------------------------------------------------------------------

interface StudySessionProps {
  set: Set
  cards: Card[]
}

export default function StudySession({ set, cards }: StudySessionProps) {
  const [phase, setPhase] = useState<Phase>('picking')
  const [activeMode, setActiveMode] = useState<StudyMode>('flashcard')
  const sessionRef = useRef<Promise<string | null> | null>(null)
  // The index of the card already graded. A double press or key auto-repeat
  // can call handleAnswer twice before re-render; both calls would see the
  // same state, skip a card and drop an answer.
  const gradedIndex = useRef(-1)
  const [resultsSaved, setResultsSaved] = useState(true)
  const [deck, setDeck] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<CardAnswer[]>([])
  const [cardStartTime, setCardStartTime] = useState(0)
  const [loadingMode, setLoadingMode] = useState<StudyMode | null>(null)
  const [error, setError] = useState('')

  const flashcards = cards.filter((c): c is FlashCardType => c.type === 'flashcard')
  const diagrams = cards.filter((c): c is DiagramCardType => c.type === 'diagram')

  // -------------------------------------------------------------------------
  // Start / restart session
  // -------------------------------------------------------------------------

  const beginStudy = useCallback(async (mode: StudyMode, cardList: Card[]) => {
    setError('')
    setResultsSaved(true)
    // The cards are already here — don't make studying wait on the API, which
    // may be cold-starting. The session record is created alongside, and the
    // results submission waits for it at the end.
    sessionRef.current = withColdStartRetry(() =>
      apiFetch('/sessions', {
        method: 'POST',
        body: JSON.stringify({ set_id: set.id, mode }),
      })
    )
      .then(async (res) => (res.ok ? ((await res.json()).id as string) : null))
      .catch(() => null)

    gradedIndex.current = -1
    setActiveMode(mode)
    setDeck(shuffle(cardList))
    setCurrentIndex(0)
    setAnswers([])
    setCardStartTime(Date.now())
    setPhase('studying')
  }, [set.id])

  async function handleModeSelect(mode: StudyMode) {
    setLoadingMode(mode)
    const cardList =
      mode === 'flashcard' ? flashcards : mode === 'diagram' ? diagrams : [...flashcards, ...diagrams]
    await beginStudy(mode, cardList)
    setLoadingMode(null)
  }

  // -------------------------------------------------------------------------
  // Answer handling
  // -------------------------------------------------------------------------

  const handleAnswer = useCallback(
    async (grade: Grade, labelGrades?: Grade[]) => {
      if (gradedIndex.current === currentIndex) return
      gradedIndex.current = currentIndex
      const card = deck[currentIndex]
      const time_taken_ms = Date.now() - cardStartTime
      const answer: CardAnswer = { card, grade, time_taken_ms, labelGrades }
      const newAnswers = [...answers, answer]
      setAnswers(newAnswers)

      if (currentIndex + 1 >= deck.length) {
        // Show the score straight away; recording it is best-effort.
        setPhase('results')
        const sessionId = await sessionRef.current
        let ok = false
        if (sessionId) {
          try {
            const res = await withColdStartRetry(() =>
              apiFetch('/results', {
                method: 'POST',
                body: JSON.stringify({
                  session_id: sessionId,
                  results: newAnswers.map((a) => ({
                    card_id: a.card.id,
                    grade: a.grade,
                    time_taken_ms: a.time_taken_ms,
                  })),
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
        setCardStartTime(Date.now())
      }
    },
    [deck, currentIndex, answers, cardStartTime]
  )

  // -------------------------------------------------------------------------
  // Retry missed cards
  // -------------------------------------------------------------------------

  async function handleRetryMissed(missedCards: Card[]) {
    const mode = detectMode(missedCards)
    setLoadingMode(mode)
    await beginStudy(mode, missedCards)
    setLoadingMode(null)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (phase === 'picking') {
    const modeOptions: ModeOption[] = [
      {
        mode: 'flashcard',
        label: 'Flashcards only',
        description: 'Reveal the answer, then mark it Confident, Almost or Need review',
        count: flashcards.length,
        icon: <FlashIcon />,
        disabled: flashcards.length === 0,
      },
      {
        mode: 'diagram',
        label: 'Diagrams only',
        description: 'Type labels into blacked-out boxes on anatomical diagrams',
        count: diagrams.length,
        icon: <DiagramIcon />,
        disabled: diagrams.length === 0,
      },
      {
        mode: 'mixed',
        label: 'Mixed',
        description: 'All card types shuffled together',
        count: cards.length,
        icon: <MixedIcon />,
        disabled: flashcards.length === 0 || diagrams.length === 0,
      },
    ]

    return (
      <div className="p-8 lg:p-12 max-w-lg">
        <Link
          href={`/sets/${set.id}`}
          className="text-xs font-medium text-[#45474d] hover:text-[#051125] transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>arrow_back</span>
          {set.title}
        </Link>
        <h1 className="text-3xl font-extrabold text-[#051125] mt-4 mb-1" style={{ fontFamily: 'var(--font-manrope)' }}>
          How do you want to study?
        </h1>
        <p className="text-sm text-[#45474d] mb-8">Pick a mode to start your session.</p>
        {error && <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] rounded-lg px-4 py-2 mb-4">{error}</p>}
        <ModePicker options={modeOptions} onSelect={handleModeSelect} loading={loadingMode} />
      </div>
    )
  }

  if (phase === 'results') {
    return (
      <div className="p-8 lg:p-12">
        {!resultsSaved && (
          <p role="status" className="mx-auto mb-4 max-w-2xl rounded-lg bg-[#fdf8ef] border border-[#f0d9a8] px-4 py-2 text-sm text-[#45474d]">
            This score couldn&apos;t be saved to your history — the study server didn&apos;t respond. Your answers above are still accurate.
          </p>
        )}
        <ResultsSummary
          set={set}
          answers={answers}
          onRetryMissed={handleRetryMissed}
          onStudyAgain={() => setPhase('picking')}
        />
      </div>
    )
  }

  // Studying phase
  const currentCard = deck[currentIndex]
  const progress = ((currentIndex) / deck.length) * 100

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress header */}
      <div className="bg-[#f8f9fa]/80 backdrop-blur-md border-b border-[#c5c6cd]/20 px-6 py-4 lg:px-8">
        <div className="flex items-end justify-between mb-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#006972]">
              Current Module
            </span>
            <h1 className="text-xl font-extrabold text-[#051125] tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
              {set.title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#45474d]">
              Card <span className="text-[#051125]">{currentIndex + 1}</span> of {deck.length}
            </span>
            <Link
              href={`/sets/${set.id}`}
              onClick={(e) => {
                if (currentIndex > 0 && !window.confirm("Leave this session? Your progress won't be saved.")) {
                  e.preventDefault()
                }
              }}
              className="text-xs font-medium text-[#45474d] hover:text-[#051125] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>close</span>
              Exit
            </Link>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e7e8e9]">
          <div
            className="h-full bg-[#006972] transition-all duration-300 rounded-full"
            style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(0,105,114,0.3)' }}
          />
        </div>
      </div>

      {/* Quiz area */}
      <div className="flex-1 p-6 lg:p-10">
        {currentCard.type === 'flashcard' ? (
          <FlashcardQuiz
            key={currentCard.id}
            card={currentCard}
            onAnswer={handleAnswer}
          />
        ) : (
          <DiagramQuiz
            key={currentCard.id}
            card={currentCard}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    </div>
  )
}
