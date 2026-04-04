'use client'

import { useState } from 'react'
import type { Set, Card, FlashCard as FlashCardType, DiagramCard as DiagramCardType } from '@/types'
import SetHeader from './SetHeader'
import FlashCard from '@/components/cards/FlashCard'
import DiagramCard from '@/components/cards/DiagramCard'
import CardEditor from '@/components/cards/CardEditor'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

type TabType = 'flashcard' | 'diagram'

interface EditorState {
  open: boolean
  mode: TabType
  card: Card | null
}

interface SetDetailProps {
  initialSet: Set
  initialCards: Card[]
  isOwner: boolean
  userId: string
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export default function SetDetail({ initialSet, initialCards, isOwner, userId }: SetDetailProps) {
  const [set, setSet] = useState<Set>(initialSet)
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [activeTab, setActiveTab] = useState<TabType>('flashcard')
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'flashcard', card: null })

  const flashcards = cards.filter((c): c is FlashCardType => c.type === 'flashcard')
  const diagrams = cards.filter((c): c is DiagramCardType => c.type === 'diagram')

  function openNewEditor(mode: TabType) {
    setEditor({ open: true, mode, card: null })
  }

  function openEditEditor(card: Card) {
    setEditor({ open: true, mode: card.type, card })
  }

  function closeEditor() {
    setEditor((s) => ({ ...s, open: false }))
  }

  function handleSave(saved: Card) {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    // Sync card_count on the set
    setSet((s) => ({
      ...s,
      card_count: cards.length + (cards.find((c) => c.id === saved.id) ? 0 : 1),
    }))
    closeEditor()
  }

  function handleDelete(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
    setSet((s) => ({ ...s, card_count: Math.max(0, s.card_count - 1) }))
    closeEditor()
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'flashcard', label: 'Flashcards', count: flashcards.length },
    { key: 'diagram', label: 'Diagrams', count: diagrams.length },
  ]

  return (
    <>
      <SetHeader
        set={set}
        cardCount={cards.length}
        isOwner={isOwner}
        onUpdate={setSet}
      />

      {/* Tabs */}
      <div className="border-b border-stone-200 bg-white px-6 lg:px-8">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-1 pb-3 pt-3 text-sm font-medium mr-6 transition-colors',
                activeTab === tab.key
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                  activeTab === tab.key
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-500'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 lg:p-8">
        {activeTab === 'flashcard' && (
          <div className="flex flex-col gap-3">
            {flashcards.length === 0 ? (
              <EmptyState
                heading="No flashcards yet"
                subtext="Add your first flashcard to this set."
                action={isOwner ? { label: 'Add flashcard', onClick: () => openNewEditor('flashcard') } : undefined}
              />
            ) : (
              <>
                {flashcards.map((card) => (
                  <FlashCard
                    key={card.id}
                    card={card}
                    isOwner={isOwner}
                    onEdit={() => openEditEditor(card)}
                    onDelete={() => openEditEditor(card)}
                  />
                ))}
                {isOwner && (
                  <button
                    onClick={() => openNewEditor('flashcard')}
                    className="flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 px-5 py-4 text-sm text-stone-400 hover:border-stone-300 hover:text-stone-600 transition-colors"
                  >
                    <PlusIcon />
                    Add flashcard
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'diagram' && (
          <div className="flex flex-col gap-3">
            {diagrams.length === 0 ? (
              <EmptyState
                heading="No diagram cards yet"
                subtext="Upload a diagram image and label its structures."
                action={isOwner ? { label: 'Add diagram', onClick: () => openNewEditor('diagram') } : undefined}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {diagrams.map((card) => (
                    <DiagramCard
                      key={card.id}
                      card={card}
                      isOwner={isOwner}
                      onEdit={() => openEditEditor(card)}
                      onDelete={() => openEditEditor(card)}
                    />
                  ))}
                </div>
                {isOwner && (
                  <button
                    onClick={() => openNewEditor('diagram')}
                    className="flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 px-5 py-4 text-sm text-stone-400 hover:border-stone-300 hover:text-stone-600 transition-colors"
                  >
                    <PlusIcon />
                    Add diagram
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Card editor modal */}
      <Modal
        open={editor.open}
        onClose={closeEditor}
        title={
          editor.card
            ? `Edit ${editor.mode === 'flashcard' ? 'flashcard' : 'diagram'}`
            : `New ${editor.mode === 'flashcard' ? 'flashcard' : 'diagram'}`
        }
        className="max-w-xl"
      >
        <div className="mt-2">
          <CardEditor
            mode={editor.mode}
            setId={set.id}
            userId={userId}
            card={editor.card}
            onSave={handleSave}
            onDelete={editor.card ? handleDelete : undefined}
          />
        </div>
      </Modal>
    </>
  )
}
