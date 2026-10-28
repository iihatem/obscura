'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Set, Card, FlashCard as FlashCardType, DiagramCard as DiagramCardType } from '@/types'
import SetHeader from './SetHeader'
import FlashCard from '@/components/cards/FlashCard'
import DiagramCard from '@/components/cards/DiagramCard'
import CardEditor from '@/components/cards/CardEditor'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import FileUploader, { type PageData } from '@/components/upload/FileUploader'
import PagePicker, { type SelectedPage } from '@/components/upload/PagePicker'
import GenerationProgress, { type GenerationSnapshot } from '@/components/upload/GenerationProgress'
import { clearDraft, loadDraft } from '@/lib/drafts'
import { cn } from '@/lib/utils'

type TabType = 'flashcard' | 'diagram'

type UploadStep = 'upload' | 'pick' | 'generate'

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

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

export default function SetDetail({ initialSet, initialCards, isOwner, userId }: SetDetailProps) {
  const [set, setSet] = useState<Set>(initialSet)
  const [cards, setCards] = useState<Card[]>(initialCards)
  // router.refresh() (after saving generated cards) sends fresh server props.
  useEffect(() => { setCards(initialCards) }, [initialCards])
  useEffect(() => { setSet(initialSet) }, [initialSet])
  const [activeTab, setActiveTab] = useState<TabType>('flashcard')
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'flashcard', card: null })

  // Upload flow state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadStep, setUploadStep] = useState<UploadStep>('upload')
  const [uploadPages, setUploadPages] = useState<PageData[]>([])
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([])
  const [restored, setRestored] = useState<GenerationSnapshot | undefined>()
  // Remounts the uploader after a discard, so it starts from a clean slate.
  const [uploadRun, setUploadRun] = useState(0)

  // Closing the dialog only hides it: an upload in progress — or generated
  // cards not yet saved — is waiting when it's reopened.
  const uploadInProgress = uploadStep !== 'upload'

  function openUpload() {
    setUploadOpen(true)
  }

  // Unsaved cards from an earlier visit, kept by GenerationProgress.
  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    loadDraft<SelectedPage[], GenerationSnapshot>(set.id).then((draft) => {
      if (cancelled || !draft) return
      setSelectedPages(draft.pages)
      setRestored(draft.state)
      setUploadStep((step) => (step === 'upload' ? 'generate' : step))
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A brand-new set arrives with ?upload=1 — go straight to adding material.
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (isOwner && searchParams.get('upload') === '1') {
      openUpload()
      router.replace(`/sets/${set.id}`, { scroll: false })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function closeUpload() {
    setUploadOpen(false)
  }

  function discardUpload() {
    // Each generated page already used a generation from today's allowance.
    if (
      uploadStep === 'generate' &&
      !window.confirm("Discard the generated cards? The generations they used today won't be refunded.")
    ) {
      return
    }
    clearDraft(set.id)
    resetUpload()
  }

  function resetUpload() {
    setUploadStep('upload')
    setUploadPages([])
    setSelectedPages([])
    setRestored(undefined)
    setUploadRun((n) => n + 1)
  }

  function handlePagesReady(pages: PageData[]) {
    setUploadPages(pages)
    setUploadStep('pick')
  }

  function handleGenerate(pages: SelectedPage[]) {
    setSelectedPages(pages)
    setRestored(undefined)
    setUploadStep('generate')
  }

  function handleGenerationDone() {
    // Pick up the new cards from the DB, keeping the user on the tab they're on.
    setUploadOpen(false)
    resetUpload()
    router.refresh()
  }

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

      {/* Tabs + Upload button */}
      <div className="border-b border-stone-200 bg-white px-6 lg:px-8">
        <div className="flex items-center justify-between">
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
        {isOwner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={openUpload}
            className="mb-1 gap-1.5"
          >
            <UploadIcon />
            Upload PDF or image
          </Button>
        )}
        </div>
      </div>

      {isOwner && uploadInProgress && !uploadOpen && (
        <div className="mx-6 mt-6 flex flex-col gap-3 rounded-xl border border-[#006972]/20 bg-[#006972]/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:mx-8">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[20px] text-[#006972]" aria-hidden>pending_actions</span>
            <p className="text-sm text-[#051125]">
              {uploadStep === 'pick'
                ? `Your upload is waiting — ${uploadPages.length} page${uploadPages.length !== 1 ? 's' : ''} ready to pick from.`
                : 'You have generated cards that aren’t saved to this set yet.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={discardUpload}>
              Discard
            </Button>
            <Button size="sm" onClick={openUpload}>
              {uploadStep === 'pick' ? 'Continue' : 'Review & save'}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 lg:p-8">
        {isOwner && cards.length === 0 ? (
          // An empty set's next step is almost always the upload, not typing cards by hand.
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#006972]/10">
              <span className="material-symbols-outlined text-[28px] text-[#006972]" aria-hidden>cloud_upload</span>
            </div>
            <h3 className="text-base font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
              Add your lecture material
            </h3>
            <p className="mt-1 max-w-sm text-sm text-[#45474d]">
              Upload a PDF or image and we&apos;ll draft flashcards and diagram quizzes for you to review.
            </p>
            <Button onClick={openUpload} size="lg" className="mt-5 gap-1.5">
              <UploadIcon />
              Upload PDF or image
            </Button>
            <button
              type="button"
              onClick={() => openNewEditor(activeTab)}
              className="mt-3 text-sm text-[#45474d] hover:text-[#051125] hover:underline"
            >
              or add a {activeTab === 'flashcard' ? 'flashcard' : 'diagram'} by hand
            </button>
          </div>
        ) : (
        <>
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
        </>
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
            key={editor.card?.id ?? 'new'}
            mode={editor.mode}
            setId={set.id}
            userId={userId}
            card={editor.card}
            onSave={handleSave}
            onDelete={editor.card ? handleDelete : undefined}
          />
        </div>
      </Modal>

      {/* Upload & AI generation modal */}
      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title={
          uploadStep === 'upload'
            ? 'Upload PDF or image'
            : uploadStep === 'pick'
            ? `${uploadPages.length} page${uploadPages.length !== 1 ? 's' : ''} — pick what to generate`
            : 'Generate and review cards'
        }
        className="max-w-4xl w-full"
      >
        <div className="mt-2" key={uploadRun}>
          {uploadStep === 'upload' && (
            <FileUploader onPagesReady={handlePagesReady} />
          )}
          {uploadStep === 'pick' && (
            <PagePicker pages={uploadPages} onGenerate={handleGenerate} />
          )}
          {uploadStep === 'generate' && (
            <GenerationProgress
              pages={selectedPages}
              setId={set.id}
              userId={userId}
              restored={restored}
              onDone={handleGenerationDone}
            />
          )}
        </div>
        {uploadInProgress && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4">
            <p className="text-xs text-stone-500">
              Closing this keeps your progress — pick it up from the set page.
            </p>
            <button
              type="button"
              onClick={discardUpload}
              className="text-xs font-medium text-stone-500 hover:text-red-600 hover:underline"
            >
              Discard and start over
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
