'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Set, Card, FlashCard as FlashCardType, DiagramCard as DiagramCardType } from '@/types'
import SetHeader from './SetHeader'
import FlashCard from '@/components/cards/FlashCard'
import DiagramCard from '@/components/cards/DiagramCard'
import CardEditor from '@/components/cards/CardEditor'
import SuggestFixDialog from '@/components/suggestions/SuggestFixDialog'
import SuggestionsReview from '@/components/suggestions/SuggestionsReview'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Menu, { MenuItem } from '@/components/ui/Menu'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, errorMessage } from '@/lib/api'
import FileUploader, { type PageData } from '@/components/upload/FileUploader'
import PagePicker, { type SelectedPage } from '@/components/upload/PagePicker'
import GenerationProgress, { type GenerationSnapshot } from '@/components/upload/GenerationProgress'
import { clearDraft, loadDraft } from '@/lib/drafts'
import { cn } from '@/lib/utils'
import { Check, Clock, FileUp, Image as ImageIcon, Import, Layers, PenLine, Plus } from 'lucide-react'
import ImportCardsDialog from './ImportCardsDialog'

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
  /** The exam plan panel, shown under the header. */
  plan?: ReactNode
}

export default function SetDetail({ initialSet, initialCards, isOwner, userId, plan }: SetDetailProps) {
  const [set, setSet] = useState<Set>(initialSet)
  const [cards, setCards] = useState<Card[]>(initialCards)
  // router.refresh() (after saving generated cards) sends fresh server props.
  useEffect(() => { setCards(initialCards) }, [initialCards])
  useEffect(() => { setSet(initialSet) }, [initialSet])
  const [activeTab, setActiveTab] = useState<TabType>('flashcard')
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'flashcard', card: null })
  // The card a non-owner is suggesting a fix for.
  const [suggesting, setSuggesting] = useState<Card | null>(null)

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

  // A brand-new set arrives with ?upload=1 (or ?import=1) — go straight to adding material.
  const router = useRouter()
  const searchParams = useSearchParams()
  const [importOpen, setImportOpen] = useState(() => isOwner && searchParams.get('import') === '1')
  useEffect(() => {
    if (isOwner && searchParams.get('upload') === '1') {
      openUpload()
      router.replace(`/sets/${set.id}`, { scroll: false })
    } else if (importOpen) {
      router.replace(`/sets/${set.id}`, { scroll: false })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function closeUpload() {
    setUploadOpen(false)
  }

  const [confirmDiscard, setConfirmDiscard] = useState(false)

  function discardUpload() {
    // Each generated page already used part of today's allowance, so ask first.
    if (uploadStep === 'generate') setConfirmDiscard(true)
    else reallyDiscard()
  }

  function reallyDiscard() {
    setConfirmDiscard(false)
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
  const { toast } = useToast()

  function openNewEditor(mode: TabType) {
    setEditor({ open: true, mode, card: null })
  }

  function openEditEditor(card: Card) {
    setEditor({ open: true, mode: card.type, card })
  }

  function closeEditor() {
    setEditor((s) => ({ ...s, open: false }))
  }

  // Bumped after each save so the next new card starts from a blank editor.
  const [editorRun, setEditorRun] = useState(0)

  function handleSave(saved: Card) {
    setEditorRun((n) => n + 1)
    const isNew = !cards.some((c) => c.id === saved.id)
    setCards((prev) => (isNew ? [...prev, saved] : prev.map((c) => (c.id === saved.id ? saved : c))))
    if (isNew) setSet((s) => ({ ...s, card_count: s.card_count + 1 }))
    closeEditor()
  }

  function handleDelete(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
    setSet((s) => ({ ...s, card_count: Math.max(0, s.card_count - 1) }))
    closeEditor()
  }

  // Deleting straight from the list, after a confirmation.
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState(false)
  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/cards/${pendingDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't delete the card. Please try again."))
      handleDelete(pendingDelete.id)
      toast('Card deleted')
      setPendingDelete(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Show whichever kind the set actually has when one tab would be empty.
  const tab: TabType = activeTab === 'flashcard' && !flashcards.length && diagrams.length ? 'diagram'
    : activeTab === 'diagram' && !diagrams.length && flashcards.length ? 'flashcard'
    : activeTab

  const steps: { key: UploadStep; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'pick', label: 'Pick pages' },
    { key: 'generate', label: 'Review cards' },
  ]
  const stepIndex = steps.findIndex((s) => s.key === uploadStep)

  return (
    <>
      <SetHeader
        set={set}
        flashcardCount={flashcards.length}
        diagramCount={diagrams.length}
        isOwner={isOwner}
        onUpdate={setSet}
        suggestions={isOwner && <SuggestionsReview setId={set.id} cards={cards} onCardUpdated={(c) => setCards((prev) => prev.map((x) => (x.id === c.id ? c : x)))} />}
      />

      {plan}

      {isOwner && uploadInProgress && !uploadOpen && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" aria-hidden />
            <p className="text-[15px] text-ink">
              {uploadStep === 'pick'
                ? `Your upload is waiting: ${uploadPages.length} page${uploadPages.length !== 1 ? 's' : ''} ready to pick from.`
                : 'You have generated cards that aren’t saved to this set yet.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={discardUpload}>Discard</Button>
            <Button size="sm" onClick={openUpload}>{uploadStep === 'pick' ? 'Continue' : 'Review and save'}</Button>
          </div>
        </div>
      )}

      {isOwner && cards.length === 0 ? (
        // An empty set's next step is almost always the upload, not typing cards by hand.
        <section className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
            <FileUp className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-[22px] font-bold text-ink">Add your lecture</h2>
          <p className="mt-2 max-w-md text-ink-muted">
            Upload the slides as a PDF, or a photo of a diagram. Obscura drafts flashcards and diagram quizzes, and you review every card before it&apos;s saved.
          </p>
          <Button onClick={openUpload} size="lg" className="mt-6">
            <FileUp className="h-4 w-4" aria-hidden />
            Upload a PDF or image
          </Button>
          <div className="mt-4 flex gap-4 text-sm">
            <button type="button" onClick={() => openNewEditor('flashcard')} className="text-ink-muted hover:text-ink hover:underline">Write a flashcard</button>
            <button type="button" onClick={() => openNewEditor('diagram')} className="text-ink-muted hover:text-ink hover:underline">Add a diagram</button>
            <button type="button" onClick={() => setImportOpen(true)} className="text-ink-muted hover:text-ink hover:underline">Import cards</button>
          </div>
        </section>
      ) : cards.length === 0 ? (
        <p className="py-16 text-center text-ink-muted">This set has no cards yet.</p>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <SegmentedControl
              label="Card type"
              value={tab}
              onChange={setActiveTab}
              options={[
                { value: 'flashcard', label: `Flashcards ${flashcards.length}`, icon: <Layers className="h-4 w-4" aria-hidden /> },
                { value: 'diagram', label: `Diagrams ${diagrams.length}`, icon: <ImageIcon className="h-4 w-4" aria-hidden /> },
              ]}
            />
            {isOwner && (
              <Menu
                trigger={(props) => (
                  <Button variant="secondary" {...props} aria-label="Add cards" className="w-10 shrink-0 px-0 sm:w-auto sm:px-4.5">
                    <Plus className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Add cards</span>
                  </Button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem onSelect={() => { close(); openUpload() }} icon={<FileUp className="h-4 w-4 text-ink-muted" aria-hidden />}>Upload a lecture</MenuItem>
                    <MenuItem onSelect={() => { close(); openNewEditor('flashcard') }} icon={<PenLine className="h-4 w-4 text-ink-muted" aria-hidden />}>Write a flashcard</MenuItem>
                    <MenuItem onSelect={() => { close(); openNewEditor('diagram') }} icon={<ImageIcon className="h-4 w-4 text-ink-muted" aria-hidden />}>Add a diagram</MenuItem>
                    <MenuItem onSelect={() => { close(); setImportOpen(true) }} icon={<Import className="h-4 w-4 text-ink-muted" aria-hidden />}>Import cards</MenuItem>
                  </>
                )}
              </Menu>
            )}
          </div>

          {tab === 'flashcard' && (
            flashcards.length === 0 ? (
              <p className="py-12 text-center text-ink-muted">No flashcards in this set yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {flashcards.map((card) => (
                  <FlashCard key={card.id} card={card} isOwner={isOwner} onEdit={() => openEditEditor(card)} onDelete={() => setPendingDelete(card)} onSuggest={() => setSuggesting(card)} />
                ))}
              </div>
            )
          )}

          {tab === 'diagram' && (
            diagrams.length === 0 ? (
              <p className="py-12 text-center text-ink-muted">No diagrams in this set yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {diagrams.map((card) => (
                  <DiagramCard key={card.id} card={card} isOwner={isOwner} onEdit={() => openEditEditor(card)} onDelete={() => setPendingDelete(card)} onSuggest={() => setSuggesting(card)} />
                ))}
              </div>
            )
          )}
        </section>
      )}

      {/* Card editor */}
      <Modal
        open={editor.open}
        onClose={closeEditor}
        title={editor.card ? `Edit ${editor.mode === 'flashcard' ? 'flashcard' : 'diagram'}` : editor.mode === 'flashcard' ? 'Write a flashcard' : 'Add a diagram'}
        className="sm:max-w-xl"
      >
        <CardEditor
          key={editor.card?.id ?? `new-${editor.mode}-${editorRun}`}
          mode={editor.mode}
          setId={set.id}
          userId={userId}
          card={editor.card}
          onSave={handleSave}
          onDelete={editor.card ? handleDelete : undefined}
        />
      </Modal>

      {!isOwner && <SuggestFixDialog card={suggesting} onClose={() => setSuggesting(null)} />}

      {/* Delete a card */}
      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title="Delete this card?" description={pendingDelete?.type === 'flashcard' ? `“${pendingDelete.front.slice(0, 120)}” will be removed from the set.` : 'This diagram and its labels will be removed from the set.'}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>Keep it</Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete card</Button>
        </div>
      </Modal>

      {/* Upload and generation */}
      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title={uploadStep === 'upload' ? 'Upload a lecture' : uploadStep === 'pick' ? 'Pick the pages to use' : 'Review your new cards'}
        className="sm:max-w-4xl"
      >
        <ol className="mb-5 flex items-center gap-2 text-[13px]" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2" aria-current={i === stepIndex ? 'step' : undefined}>
              <span className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                i < stepIndex ? 'bg-accent text-surface' : i === stepIndex ? 'bg-ink text-on-ink' : 'bg-paper-2 text-ink-muted'
              )}>
                {i < stepIndex ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn(i === stepIndex ? 'font-semibold text-ink' : 'text-ink-muted', i !== stepIndex && 'hidden sm:inline')}>{s.label}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line sm:w-10" aria-hidden />}
            </li>
          ))}
        </ol>
        <div key={uploadRun}>
          {uploadStep === 'upload' && <FileUploader onPagesReady={handlePagesReady} />}
          {uploadStep === 'pick' && <PagePicker pages={uploadPages} onGenerate={handleGenerate} />}
          {uploadStep === 'generate' && (
            <GenerationProgress pages={selectedPages} setId={set.id} userId={userId} restored={restored} onDone={handleGenerationDone} />
          )}
        </div>
        {uploadInProgress && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <p className="text-[13px] text-ink-muted">Closing this keeps your progress. Pick it up from the set page.</p>
            <button type="button" onClick={discardUpload} className="text-[13px] font-medium text-ink-muted hover:text-bad hover:underline">
              Discard and start over
            </button>
          </div>
        )}
      </Modal>

      {isOwner && (
        <ImportCardsDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          setId={set.id}
          onImported={() => { setImportOpen(false); setActiveTab('flashcard'); router.refresh() }}
        />
      )}

      <Modal open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard the generated cards?" description="The pages they used still count toward today's allowance.">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep them</Button>
          <Button variant="danger" onClick={reallyDiscard}>Discard</Button>
        </div>
      </Modal>
    </>
  )
}
