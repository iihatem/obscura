'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { apiFetch, ApiUnavailableError, withColdStartRetry } from '@/lib/api'
import { clearDraft, saveDraftPages, saveDraftState } from '@/lib/drafts'
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
  /** HTTP status of a failed request — a 429 means retrying today won't help. */
  httpStatus?: number
  /** Shown under a page that's still generating, e.g. while the server wakes. */
  note?: string
  model?: string
  // Diagram pages
  labels?: Label[]
  croppedDataUrl?: string   // cropped diagram image returned by the backend
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

/** What's kept in the browser so an unsaved generation survives leaving the page. */
export interface GenerationSnapshot {
  // Pages are stored once on their own; repeating their images here would
  // rewrite megabytes on every edit.
  results: (Omit<PageResult, 'page'> & { pageIndex: number })[]
  reviewing: boolean
  draftCards: DraftCard[]
}

interface GenerationProgressProps {
  pages: SelectedPage[]
  setId: string
  userId: string
  /** A generation from an earlier visit, picked up instead of starting over. */
  restored?: GenerationSnapshot
  onDone: (cards: DraftCard[]) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Restored drafts carry their ids, so a per-page-load counter would collide.
function draftId() {
  return crypto.randomUUID()
}

function restoreResults(pages: SelectedPage[], snapshot: GenerationSnapshot): PageResult[] {
  return pages.map((page) => {
    const saved = snapshot.results.find((r) => r.pageIndex === page.pageData.pageIndex)
    if (!saved) return { page, status: 'pending' }
    // A request cut off by leaving the page never reported back.
    if (saved.status === 'pending' || saved.status === 'generating') {
      return { ...saved, page, status: 'error', error: 'Stopped when you left the page.', note: undefined }
    }
    return { ...saved, page }
  })
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/**
 * FastAPI reports failures as `detail`, so quota and API-key messages from the
 * backend surface verbatim rather than collapsing to a generic string.
 */
async function httpError(res: Response, fallback: string): Promise<HttpError> {
  const body = await res.json().catch(() => ({}))
  return new HttpError(body.detail ?? body.error ?? fallback, res.status)
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

export default function GenerationProgress({ pages, setId, userId, restored, onDone }: GenerationProgressProps) {
  const [results, setResults] = useState<PageResult[]>(() =>
    restored ? restoreResults(pages, restored) : pages.map((page) => ({ page, status: 'pending' }))
  )
  const [reviewing, setReviewing] = useState(restored?.reviewing ?? false)
  const [draftCards, setDraftCards] = useState<DraftCard[]>(restored?.draftCards ?? [])
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

  const generatePage = useCallback(async (page: SelectedPage) => {
    const idx = page.pageData.pageIndex
    const commaIdx = page.pageData.dataUrl.indexOf(',')
    const imageBase64 = page.pageData.dataUrl.slice(commaIdx + 1)

    if (page.type === 'diagram') {
      const res = await apiFetch('/generate/labels', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, setId }),
      })
      if (!res.ok) throw await httpError(res, 'Label generation failed')
      const { labels, croppedImageBase64, model } = await res.json()
      const croppedDataUrl = croppedImageBase64
        ? `data:image/jpeg;base64,${croppedImageBase64}`
        : undefined
      updateResult(idx, { status: 'done', labels, croppedDataUrl, model, note: undefined })
    } else {
      const res = await apiFetch('/generate/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64,
          setId,
          extractedText: page.pageData.extractedText,
        }),
      })
      if (!res.ok) throw await httpError(res, 'Flashcard generation failed')
      const { cards, model } = await res.json()
      updateResult(idx, { status: 'done', cards, model, note: undefined })
    }
  }, [setId, updateResult])

  const processPage = useCallback(async (page: SelectedPage) => {
    const idx = page.pageData.pageIndex
    updateResult(idx, { status: 'generating', error: undefined, httpStatus: undefined, note: undefined })
    try {
      // Waiting out a cold start beats making the user click Retry on every page.
      await withColdStartRetry(
        () => generatePage(page),
        () => updateResult(idx, { note: 'The study server is waking up — retrying automatically…' })
      )
    } catch (err) {
      updateResult(idx, {
        status: 'error',
        error: (err as Error).message,
        httpStatus: err instanceof HttpError ? err.status : undefined,
        note: undefined,
      })
    }
  }, [generatePage, updateResult])

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (restored) return
    saveDraftPages(setId, pages)

    async function runAll() {
      // Process in chunks of CHUNK_SIZE concurrently
      for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
        const chunk = pages.slice(i, i + CHUNK_SIZE)
        await Promise.all(chunk.map(processPage))
      }
    }

    runAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Each generated card already used part of today's allowance, so keep the
  // work in the browser until it's saved to the set. Edits are batched; the
  // last batch is written when the component goes away.
  const pendingWrite = useRef<GenerationSnapshot | null>(null)
  useEffect(() => {
    pendingWrite.current = {
      results: results.map(({ page, ...rest }) => ({ ...rest, pageIndex: page.pageData.pageIndex })),
      reviewing,
      draftCards,
    }
    const timer = setTimeout(flushDraft, 400)
    return () => clearTimeout(timer)
  }, [results, reviewing, draftCards]) // eslint-disable-line react-hooks/exhaustive-deps

  function flushDraft() {
    if (pendingWrite.current) saveDraftState(setId, pendingWrite.current)
    pendingWrite.current = null
  }
  useEffect(() => () => flushDraft(), []) // eslint-disable-line react-hooks/exhaustive-deps

  // A request still in flight can't be saved — its result would be lost, and
  // the generation it used along with it.
  const busy = useRef(false)
  useEffect(() => {
    busy.current = saving || results.some((r) => r.status === 'generating')
  }, [saving, results])
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!busy.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  async function retryPage(pageIndex: number) {
    const page = pages.find((p) => p.pageData.pageIndex === pageIndex)
    if (!page) return
    await processPage(page)
  }

  const allDone = results.every((r) => r.status === 'done' || r.status === 'error')
  const successCount = results.filter((r) => r.status === 'done').length
  const retryable = results.filter((r) => r.status === 'error' && r.httpStatus !== 429)

  async function retryAllFailed() {
    for (let i = 0; i < retryable.length; i += CHUNK_SIZE) {
      await Promise.all(retryable.slice(i, i + CHUNK_SIZE).map((r) => processPage(r.page)))
    }
  }

  function buildDraftCards(): DraftCard[] {
    const cards: DraftCard[] = []
    for (const r of results) {
      if (r.status !== 'done') continue
      if (r.page.type === 'diagram' && r.labels) {
        cards.push({
          type: 'diagram',
          id: draftId(),
          dataUrl: r.croppedDataUrl ?? r.page.pageData.dataUrl,
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
    const total = draftCards.length
    try {
      let diagramIndex = 0
      for (const card of draftCards) {
        if (card.type === 'flashcard') {
          const res = await apiFetch('/cards', {
            method: 'POST',
            body: JSON.stringify({ set_id: setId, type: 'flashcard', front: card.front, back: card.back }),
          })
          if (!res.ok) throw await httpError(res, 'Failed to save flashcard')
        } else {
          // 1. Upload the diagram image to Supabase Storage
          const mimeMatch = card.dataUrl.match(/^data:([^;,]+)/)
          const fileMime = mimeMatch?.[1] ?? 'image/jpeg'
          const ext = fileMime === 'image/png' ? 'png' : fileMime === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/${setId}/diagram-${crypto.randomUUID()}.${ext}`
          diagramIndex++

          const uploadRes = await apiFetch('/upload/image', {
            method: 'POST',
            body: JSON.stringify({ dataUrl: card.dataUrl, path }),
          })
          if (!uploadRes.ok) throw await httpError(uploadRes, 'Failed to upload diagram image')
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
          if (!res.ok) throw await httpError(res, 'Failed to save diagram card')
        }
        // Drop each card as it lands, so a retry after a failure resumes
        // where it stopped instead of saving the earlier cards twice.
        setDraftCards((prev) => prev.filter((c) => c.id !== card.id))
      }
      await clearDraft(setId)
      toast(`Saved ${total} card${total !== 1 ? 's' : ''} to set`)
      onDone(draftCards)
    } catch (err) {
      const msg = err instanceof ApiUnavailableError
        ? 'The study server is waking up. Your unsaved cards are still here — try Save again in a few seconds.'
        : (err as Error).message
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
              {r.status === 'generating' && r.note && (
                <p className="text-xs text-stone-500">{r.note}</p>
              )}
              {r.status === 'error' && r.error && (
                <p className="text-xs text-red-600 break-words">{r.error}</p>
              )}
              {r.status === 'error' && (
                <div className="flex flex-wrap gap-x-4">
                  {r.httpStatus !== 429 && (
                    <button
                      onClick={() => retryPage(r.page.pageData.pageIndex)}
                      className="text-xs text-[#006972] font-medium hover:underline"
                    >
                      Retry
                    </button>
                  )}
                  {/key/i.test(r.error ?? '') && (
                    // New tab: navigating away here would throw away the other pages' results.
                    <a
                      href="/profile"
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-[#006972] font-medium hover:underline"
                    >
                      Add your own API key ↗
                    </a>
                  )}
                </div>
              )}
              {r.status === 'done' && r.page.type === 'diagram' && (
                <p className="text-xs text-stone-400">
                  {r.labels?.length ?? 0} labels detected{r.model?.startsWith('openai:') ? ' · via OpenAI' : ''}
                </p>
              )}
              {r.status === 'done' && r.page.type === 'flashcard' && (
                <p className="text-xs text-stone-400">
                  {r.cards?.length ?? 0} cards generated{r.model?.startsWith('openai:') ? ' · via OpenAI' : ''}
                </p>
              )}
            </div>
            <span className="text-xs text-stone-400 shrink-0">{statusLabel[r.status]}</span>
          </div>
        ))}
      </div>

      {allDone && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-6 py-5 text-center">
          <p className="text-sm font-medium text-stone-700">
            {successCount === 0
              ? 'Nothing was generated — see the errors above.'
              : successCount === results.length
                ? `Done! Generated content from all ${results.length} page${results.length !== 1 ? 's' : ''}.`
                : `Generated content from ${successCount} of ${results.length} pages.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {retryable.length > 0 && (
              <Button onClick={retryAllFailed} size="lg" variant={successCount > 0 ? 'secondary' : 'primary'}>
                Retry {retryable.length} failed page{retryable.length !== 1 ? 's' : ''}
              </Button>
            )}
            {successCount > 0 && (
              <Button onClick={handleReview} size="lg">
                Review cards
              </Button>
            )}
          </div>
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
        className="absolute right-3 top-3 flex rounded p-1 text-stone-300 hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-colors"
        title="Delete card"
        aria-label="Delete card"
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

  function startResize(
    e: React.MouseEvent,
    corner: 'tl' | 'tr' | 'bl' | 'br',
    label: DraftLabel,
  ) {
    e.preventDefault()
    e.stopPropagation()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const { x: lx, y: ly, width: lw, height: lh } = label
    const MIN = 2

    function onMove(ev: MouseEvent) {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      let nx = lx, ny = ly, nw = lw, nh = lh
      if (corner === 'br') {
        nw = Math.max(MIN, lw + dx); nh = Math.max(MIN, lh + dy)
      } else if (corner === 'bl') {
        nx = Math.min(lx + lw - MIN, Math.max(0, lx + dx)); nw = lw - (nx - lx); nh = Math.max(MIN, lh + dy)
      } else if (corner === 'tr') {
        ny = Math.min(ly + lh - MIN, Math.max(0, ly + dy)); nh = lh - (ny - ly); nw = Math.max(MIN, lw + dx)
      } else {
        nx = Math.min(lx + lw - MIN, Math.max(0, lx + dx)); ny = Math.min(ly + lh - MIN, Math.max(0, ly + dy))
        nw = lw - (nx - lx); nh = lh - (ny - ly)
      }
      onUpdateLabel(label.id, 'x', nx); onUpdateLabel(label.id, 'y', ny)
      onUpdateLabel(label.id, 'width', nw); onUpdateLabel(label.id, 'height', nh)
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="group relative rounded-xl border border-stone-200 bg-white p-4">
      <button
        onClick={onDelete}
        className="absolute right-3 top-3 flex rounded p-1 text-stone-300 hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-colors"
        title="Delete card"
        aria-label="Delete card"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Image with draggable + resizable label boxes */}
        <div
          ref={containerRef}
          className="relative flex-shrink-0 select-none rounded-lg bg-stone-100 lg:w-96"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.dataUrl} alt="Diagram" className="w-full h-auto block rounded-lg" draggable={false} />
          {card.labels.map((label) => (
            <div
              key={label.id}
              onMouseDown={(e) => onLabelDrag(e, label, containerRef)}
              className="absolute cursor-move border-2 border-stone-900 bg-black"
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
                width: `${label.width}%`,
                height: `${label.height}%`,
              }}
            >
              {/* Corner resize handles */}
              {(['tl','tr','bl','br'] as const).map((c) => (
                <div
                  key={c}
                  onMouseDown={(e) => startResize(e, c, label)}
                  className="absolute w-2.5 h-2.5 bg-white border border-stone-700 rounded-sm z-10"
                  style={{
                    cursor: `${c === 'tl' ? 'nw' : c === 'tr' ? 'ne' : c === 'bl' ? 'sw' : 'se'}-resize`,
                    top:    c === 'tl' || c === 'tr' ? -5 : undefined,
                    bottom: c === 'bl' || c === 'br' ? -5 : undefined,
                    left:   c === 'tl' || c === 'bl' ? -5 : undefined,
                    right:  c === 'tr' || c === 'br' ? -5 : undefined,
                  }}
                />
              ))}
            </div>
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
                  className="text-stone-300 hover:text-red-500 md:opacity-0 md:group-hover/label:opacity-100 focus:opacity-100 transition-colors"
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
