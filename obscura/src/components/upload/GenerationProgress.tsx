'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { SelectedPage } from './PagePicker'
import type { Label } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────

type PageStatus = 'pending' | 'generating' | 'done' | 'error'

interface PageResult {
  page: SelectedPage
  status: PageStatus
  error?: string
  // Diagram pages
  labels?: Label[]
  // Flashcard pages
  cards?: { front: string; back: string }[]
}

interface DraftLabel extends Label {
  id: string
}

interface DraftDiagram {
  type: 'diagram'
  id: string
  /** Local data URL — used for preview; uploaded to Supabase at save time */
  dataUrl: string
  labels: DraftLabel[]
}

interface DraftFlashcardCard {
  type: 'flashcard'
  id: string
  front: string
  back: string
}

type DraftCard = DraftDiagram | DraftFlashcardCard

interface GenerationProgressProps {
  pages: SelectedPage[]
  setId: string
  userId: string
  onDone: (cards: DraftCard[]) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _draftId = 0
function draftId() {
  return `draft-${++_draftId}`
}

const StatusIcon = ({ status }: { status: PageStatus }) => {
  if (status === 'done') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
  if (status === 'error') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
  if (status === 'pending') return (
    <div className="h-3.5 w-3.5 rounded-full border-2 border-stone-200" />
  )
  return (
    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
  )
}

const statusLabel: Record<PageStatus, string> = {
  pending: 'Waiting…',
  generating: 'Generating…',
  done: 'Done',
  error: 'Error',
}

// ─── Component ───────────────────────────────────────────────────────────────

const CHUNK_SIZE = 3

export default function GenerationProgress({ pages, setId, userId, onDone }: GenerationProgressProps) {
  const [results, setResults] = useState<PageResult[]>(
    pages.map((page) => ({ page, status: 'pending' }))
  )
  const [reviewing, setReviewing] = useState(false)
  const [draftCards, setDraftCards] = useState<DraftCard[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const ran = useRef(false)
  const { toast } = useToast()

  const updateResult = useCallback((pageIndex: number, patch: Partial<PageResult>) => {
    setResults((prev) =>
      prev.map((r) =>
        r.page.pageData.pageIndex === pageIndex ? { ...r, ...patch } : r
      )
    )
  }, [])

  const processPage = useCallback(async (page: SelectedPage) => {
    const idx = page.pageData.pageIndex
    updateResult(idx, { status: 'generating' })
    try {
      const commaIdx = page.pageData.dataUrl.indexOf(',')
      const imageBase64 = page.pageData.dataUrl.slice(commaIdx + 1)

      if (page.type === 'diagram') {
        const res = await apiFetch('/generate/labels', {
          method: 'POST',
          body: JSON.stringify({ imageBase64, setId }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? 'Label generation failed')
        }
        const { labels } = await res.json()
        updateResult(idx, { status: 'done', labels })
      } else {
        const res = await apiFetch('/generate/flashcards', {
          method: 'POST',
          body: JSON.stringify({ imageBase64, setId }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? 'Flashcard generation failed')
        }
        const { cards } = await res.json()
        updateResult(idx, { status: 'done', cards })
      }
    } catch (err) {
      updateResult(idx, { status: 'error', error: (err as Error).message })
    }
  }, [setId, updateResult])

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function runAll() {
      // Process in chunks of CHUNK_SIZE concurrently
      for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
        const chunk = pages.slice(i, i + CHUNK_SIZE)
        await Promise.all(chunk.map(processPage))
      }
    }

    runAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function retryPage(pageIndex: number) {
    const page = pages.find((p) => p.pageData.pageIndex === pageIndex)
    if (!page) return
    await processPage(page)
  }

  const allDone = results.every((r) => r.status === 'done' || r.status === 'error')
  const successCount = results.filter((r) => r.status === 'done').length

  function buildDraftCards(): DraftCard[] {
    const cards: DraftCard[] = []
    for (const r of results) {
      if (r.status !== 'done') continue
      if (r.page.type === 'diagram' && r.labels) {
        cards.push({
          type: 'diagram',
          id: draftId(),
          dataUrl: r.page.pageData.dataUrl,
          labels: r.labels.map((l) => ({ ...l, id: draftId() })),
        })
      } else if (r.page.type === 'flashcard' && r.cards) {
        for (const c of r.cards) {
          cards.push({ type: 'flashcard', id: draftId(), front: c.front, back: c.back })
        }
      }
    }
    return cards
  }

  function handleReview() {
    setDraftCards(buildDraftCards())
    setReviewing(true)
  }

  // ── Draft card mutation helpers ──────────────────────────────────────────

  function deleteCard(id: string) {
    setDraftCards((prev) => prev.filter((c) => c.id !== id))
  }

  function updateFlashcard(id: string, field: 'front' | 'back', value: string) {
    setDraftCards((prev) =>
      prev.map((c) => (c.id === id && c.type === 'flashcard' ? { ...c, [field]: value } : c))
    )
  }

  function updateLabel(cardId: string, labelId: string, field: keyof DraftLabel, value: string | number) {
    setDraftCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId || c.type !== 'diagram') return c
        return { ...c, labels: c.labels.map((l) => (l.id === labelId ? { ...l, [field]: value } : l)) }
      })
    )
  }

  function deleteLabel(cardId: string, labelId: string) {
    setDraftCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId || c.type !== 'diagram') return c
        return { ...c, labels: c.labels.filter((l) => l.id !== labelId) }
      })
    )
  }

  // ── Save: upload diagrams to Supabase, then bulk-insert cards ────────────

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      let diagramIndex = 0
      for (const card of draftCards) {
        if (card.type === 'flashcard') {
          const res = await apiFetch('/cards', {
            method: 'POST',
            body: JSON.stringify({ set_id: setId, type: 'flashcard', front: card.front, back: card.back }),
          })
          if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j.error ?? 'Failed to save flashcard')
          }
        } else {
          // 1. Upload the diagram image to Supabase Storage
          const mimeMatch = card.dataUrl.match(/^data:([^;,]+)/)
          const fileMime = mimeMatch?.[1] ?? 'image/jpeg'
          const ext = fileMime === 'image/png' ? 'png' : fileMime === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/${setId}/diagram-${diagramIndex++}.${ext}`

          const uploadRes = await apiFetch('/upload/image', {
            method: 'POST',
            body: JSON.stringify({ dataUrl: card.dataUrl, path }),
          })
          if (!uploadRes.ok) {
            const j = await uploadRes.json().catch(() => ({}))
            throw new Error(j.error ?? 'Failed to upload diagram image')
          }
          const { publicUrl } = await uploadRes.json()

          // 2. Save the diagram card with the permanent image URL
          const res = await apiFetch('/cards', {
            method: 'POST',
            body: JSON.stringify({
              set_id: setId,
              type: 'diagram',
              image_url: publicUrl,
              labels: card.labels,
            }),
          })
          if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j.error ?? 'Failed to save diagram card')
          }
        }
      }
      toast(`Saved ${draftCards.length} card${draftCards.length !== 1 ? 's' : ''} to set`)
      onDone(draftCards)
    } catch (err) {
      const msg = (err as Error).message
      setSaveError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Drag to reposition label boxes ───────────────────────────────────────

  function handleLabelDrag(
    e: React.MouseEvent<HTMLDivElement>,
    cardId: string,
    label: DraftLabel,
    containerRef: React.RefObject<HTMLDivElement | null>
  ) {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startLabelX = label.x
    const startLabelY = label.y

    function onMouseMove(ev: MouseEvent) {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      updateLabel(cardId, label.id, 'x', Math.max(0, Math.min(100 - label.width, startLabelX + dx)))
      updateLabel(cardId, label.id, 'y', Math.max(0, Math.min(100 - label.height, startLabelY + dy)))
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (reviewing) {
    return <ReviewStep
      draftCards={draftCards}
      saving={saving}
      saveError={saveError}
      onDeleteCard={deleteCard}
      onUpdateFlashcard={updateFlashcard}
      onUpdateLabel={updateLabel}
      onDeleteLabel={deleteLabel}
      onLabelDrag={handleLabelDrag}
      onSave={handleSave}
    />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <div
            key={r.page.pageData.pageIndex}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3',
              r.status === 'done' && 'border-green-100 bg-green-50',
              r.status === 'error' && 'border-red-100 bg-red-50',
              (r.status === 'pending' || r.status === 'generating') && 'border-stone-100 bg-white'
            )}
          >
            <StatusIcon status={r.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-700">
                Page {r.page.pageData.pageIndex + 1}
                <span className={cn(
                  'ml-2 text-xs font-normal',
                  r.page.type === 'diagram' ? 'text-violet-600' : 'text-blue-600'
                )}>
                  {r.page.type === 'diagram' ? 'Diagram' : 'Text'}
                </span>
              </p>
              {r.status === 'error' && r.error && (
                <p className="text-xs text-red-600 truncate">{r.error}</p>
              )}
              {r.status === 'error' && (
                <button
                  onClick={() => retryPage(r.page.pageData.pageIndex)}
                  className="text-xs text-[#006972] font-medium hover:underline"
                >
                  Retry
                </button>
              )}
              {r.status === 'done' && r.page.type === 'diagram' && (
                <p className="text-xs text-stone-400">{r.labels?.length ?? 0} labels detected</p>
              )}
              {r.status === 'done' && r.page.type === 'flashcard' && (
                <p className="text-xs text-stone-400">{r.cards?.length ?? 0} cards generated</p>
              )}
            </div>
            <span className="text-xs text-stone-400 shrink-0">{statusLabel[r.status]}</span>
          </div>
        ))}
      </div>

      {allDone && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-6 py-5 text-center">
          <p className="text-sm font-medium text-stone-700">
            Done! Generated content from {successCount} of {results.length} pages.
          </p>
          <Button onClick={handleReview} size="lg">
            Review cards
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Review step ──────────────────────────────────────────────────────────────

interface ReviewStepProps {
  draftCards: DraftCard[]
  saving: boolean
  saveError: string | null
  onDeleteCard: (id: string) => void
  onUpdateFlashcard: (id: string, field: 'front' | 'back', value: string) => void
  onUpdateLabel: (cardId: string, labelId: string, field: keyof DraftLabel, value: string | number) => void
  onDeleteLabel: (cardId: string, labelId: string) => void
  onLabelDrag: (
    e: React.MouseEvent<HTMLDivElement>,
    cardId: string,
    label: DraftLabel,
    containerRef: React.RefObject<HTMLDivElement | null>
  ) => void
  onSave: () => void
}

function ReviewStep({
  draftCards, saving, saveError,
  onDeleteCard, onUpdateFlashcard, onUpdateLabel, onDeleteLabel, onLabelDrag, onSave,
}: ReviewStepProps) {
  const flashcards = draftCards.filter((c): c is DraftFlashcardCard => c.type === 'flashcard')
  const diagrams = draftCards.filter((c): c is DraftDiagram => c.type === 'diagram')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          Review and edit before saving.{' '}
          <span className="font-medium text-stone-700">{draftCards.length} cards total</span>
        </p>
        <Button onClick={onSave} loading={saving} size="lg">
          Save {draftCards.length} card{draftCards.length !== 1 ? 's' : ''} to set
        </Button>
      </div>

      {saveError && (
        <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {saveError}
        </p>
      )}

      {flashcards.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Flashcards ({flashcards.length})
          </h3>
          <div className="flex flex-col gap-2">
            {flashcards.map((card) => (
              <FlashcardReviewCard
                key={card.id}
                card={card}
                onUpdate={(field, value) => onUpdateFlashcard(card.id, field, value)}
                onDelete={() => onDeleteCard(card.id)}
              />
            ))}
          </div>
        </section>
      )}

      {diagrams.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Diagram cards ({diagrams.length})
          </h3>
          <div className="flex flex-col gap-4">
            {diagrams.map((card) => (
              <DiagramReviewCard
                key={card.id}
                card={card}
                onUpdateLabel={(labelId, field, value) => onUpdateLabel(card.id, labelId, field, value)}
                onDeleteLabel={(labelId) => onDeleteLabel(card.id, labelId)}
                onDelete={() => onDeleteCard(card.id)}
                onLabelDrag={(e, label, ref) => onLabelDrag(e, card.id, label, ref)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onSave} loading={saving} size="lg">
          Save {draftCards.length} card{draftCards.length !== 1 ? 's' : ''} to set
        </Button>
      </div>
    </div>
  )
}

// ─── Flashcard review card ────────────────────────────────────────────────────

interface FlashcardReviewCardProps {
  card: DraftFlashcardCard
  onUpdate: (field: 'front' | 'back', value: string) => void
  onDelete: () => void
}

function FlashcardReviewCard({ card, onUpdate, onDelete }: FlashcardReviewCardProps) {
  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4">
      <button
        onClick={onDelete}
        className="absolute right-3 top-3 hidden rounded p-1 text-stone-300 hover:bg-red-50 hover:text-red-500 group-hover:flex transition-colors"
        title="Delete card"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Front</label>
        <textarea
          value={card.front}
          onChange={(e) => onUpdate('front', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Back</label>
        <textarea
          value={card.back}
          onChange={(e) => onUpdate('back', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
        />
      </div>
    </div>
  )
}

// ─── Diagram review card ──────────────────────────────────────────────────────

interface DiagramReviewCardProps {
  card: DraftDiagram
  onUpdateLabel: (labelId: string, field: keyof DraftLabel, value: string | number) => void
  onDeleteLabel: (labelId: string) => void
  onDelete: () => void
  onLabelDrag: (e: React.MouseEvent<HTMLDivElement>, label: DraftLabel, containerRef: React.RefObject<HTMLDivElement | null>) => void
}

function DiagramReviewCard({ card, onUpdateLabel, onDeleteLabel, onDelete, onLabelDrag }: DiagramReviewCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="group relative rounded-xl border border-stone-200 bg-white p-4">
      <button
        onClick={onDelete}
        className="absolute right-3 top-3 hidden rounded p-1 text-stone-300 hover:bg-red-50 hover:text-red-500 group-hover:flex transition-colors"
        title="Delete card"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Image with draggable label boxes — shown from local data URL, no upload needed */}
        <div
          ref={containerRef}
          className="relative flex-shrink-0 select-none overflow-hidden rounded-lg bg-stone-100 lg:w-96"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.dataUrl} alt="Diagram" className="w-full" draggable={false} />
          {card.labels.map((label) => (
            <div
              key={label.id}
              onMouseDown={(e) => onLabelDrag(e, label, containerRef)}
              className="absolute cursor-move rounded border-2 border-violet-500 bg-violet-500/20 hover:bg-violet-500/30 transition-colors"
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
                width: `${label.width}%`,
                height: `${label.height}%`,
              }}
              title={label.label}
            />
          ))}
        </div>

        {/* Labels list */}
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Labels ({card.labels.length})
          </p>
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-72">
            {card.labels.map((label) => (
              <div key={label.id} className="group/label flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
                <input
                  value={label.label}
                  onChange={(e) => onUpdateLabel(label.id, 'label', e.target.value)}
                  className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                <button
                  onClick={() => onDeleteLabel(label.id)}
                  className="hidden text-stone-300 hover:text-red-500 group-hover/label:block transition-colors"
                  title="Remove label"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {card.labels.length === 0 && (
              <p className="text-xs text-stone-400 italic">No labels detected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
