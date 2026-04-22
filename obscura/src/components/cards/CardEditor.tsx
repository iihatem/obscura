'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { cn, proxyImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import type { Card, Label } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardEditorProps {
  mode: 'flashcard' | 'diagram'
  setId: string
  userId: string
  card?: Card | null
  onSave: (card: Card) => void
  onDelete?: (cardId: string) => void
}

interface LabelRow extends Label {
  _key: number
}

// ---------------------------------------------------------------------------
// Flashcard editor
// ---------------------------------------------------------------------------

function FlashcardEditor({
  initialFront = '',
  initialBack = '',
  onSubmit,
  loading,
}: {
  initialFront?: string
  initialBack?: string
  onSubmit: (front: string, back: string) => void
  loading: boolean
}) {
  const [front, setFront] = useState(initialFront)
  const [back, setBack] = useState(initialBack)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-700">Front</label>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={3}
          placeholder="Question or term…"
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-700">Back</label>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={3}
          placeholder="Answer or definition…"
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
        />
      </div>
      <Button
        loading={loading}
        disabled={!front.trim() || !back.trim()}
        onClick={() => onSubmit(front, back)}
        className="self-end"
      >
        Save card
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diagram editor
// ---------------------------------------------------------------------------

function DiagramEditor({
  initialImageUrl = '',
  initialLabels = [],
  userId,
  onSubmit,
  loading,
}: {
  initialImageUrl?: string
  initialLabels?: Label[]
  userId: string
  onSubmit: (imageUrl: string, labels: Label[]) => void
  loading: boolean
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [previewSrc, setPreviewSrc] = useState(initialImageUrl)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgContainerRef = useRef<HTMLDivElement>(null)

  const [labels, setLabels] = useState<LabelRow[]>(
    initialLabels.map((l, i) => ({ ...l, _key: i }))
  )
  const nextKey = useRef(initialLabels.length)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setPreviewSrc(URL.createObjectURL(file))
    setPendingFile(file)
    setImageUrl('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function addLabel() {
    setLabels((prev) => [
      ...prev,
      { _key: nextKey.current++, label: '', x: 5, y: 5, width: 20, height: 10 },
    ])
  }

  function updateLabel(key: number, field: keyof Label, value: string | number) {
    setLabels((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: value } : l))
    )
  }

  function removeLabel(key: number) {
    setLabels((prev) => prev.filter((l) => l._key !== key))
  }

  function handleLabelDrag(e: React.MouseEvent<HTMLDivElement>, lbl: LabelRow) {
    e.preventDefault()
    e.stopPropagation()
    const container = imgContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startLX = lbl.x
    const startLY = lbl.y

    function onMove(ev: MouseEvent) {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      updateLabel(lbl._key, 'x', Math.max(0, Math.min(100 - lbl.width, startLX + dx)))
      updateLabel(lbl._key, 'y', Math.max(0, Math.min(100 - lbl.height, startLY + dy)))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function handleLabelResize(e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br', lbl: LabelRow) {
    e.preventDefault()
    e.stopPropagation()
    const container = imgContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const { x: lx, y: ly, width: lw, height: lh } = lbl
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
      updateLabel(lbl._key, 'x', nx); updateLabel(lbl._key, 'y', ny)
      updateLabel(lbl._key, 'width', nw); updateLabel(lbl._key, 'height', nh)
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  async function handleSave() {
    let finalUrl = imageUrl

    if (pendingFile) {
      setUploading(true)
      setUploadError('')
      try {
        const supabase = createClient()
        const ext = pendingFile.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${Date.now()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('card-images')
          .upload(path, pendingFile, { upsert: false })

        if (uploadErr) throw new Error(uploadErr.message)

        const { data: { publicUrl } } = supabase.storage
          .from('card-images')
          .getPublicUrl(path)

        finalUrl = publicUrl
      } catch (err) {
        setUploadError((err as Error).message)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    if (!finalUrl) {
      setUploadError('Please select an image.')
      return
    }

    const cleanLabels: Label[] = labels
      .filter((l) => l.label.trim())
      .map(({ _key: _, ...l }) => ({ ...l, label: l.label.trim() }))

    onSubmit(finalUrl, cleanLabels)
  }

  const canSave = !!(previewSrc || imageUrl) && !uploading

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {previewSrc ? (
        /* ── Image with overlay labels ────────────────────────────── */
        <div className="flex flex-col gap-2">
          {/* Change image row */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-stone-400 hover:text-stone-600 underline"
            >
              Change image
            </button>
          </div>

          {/* Image + label overlays */}
          <div
            ref={imgContainerRef}
            className="relative select-none rounded-lg bg-stone-100"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingFile ? previewSrc : proxyImageUrl(previewSrc)}
              alt="Diagram preview"
              className="w-full h-auto block rounded-lg"
              draggable={false}
            />
            {labels.map((lbl) => (
              <div
                key={lbl._key}
                onMouseDown={(e) => handleLabelDrag(e, lbl)}
                className="absolute cursor-move border-2 border-stone-900 bg-black flex items-end"
                style={{
                  left: `${lbl.x}%`,
                  top: `${lbl.y}%`,
                  width: `${lbl.width}%`,
                  height: `${lbl.height}%`,
                }}
                title={lbl.label}
              >
                {lbl.label && (
                  <span className="bg-stone-900 text-white text-[9px] font-medium px-1 leading-tight truncate max-w-full">
                    {lbl.label}
                  </span>
                )}
                {/* Corner resize handles */}
                {(['tl','tr','bl','br'] as const).map((c) => (
                  <div
                    key={c}
                    onMouseDown={(e) => handleLabelResize(e, c, lbl)}
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
        </div>
      ) : (
        /* ── Empty dropzone ───────────────────────────────────────── */
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
            isDragOver ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <svg className="text-stone-300" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="mt-2 text-sm text-stone-500">Drop an image or click to browse</p>
          <p className="text-xs text-stone-400">PNG, JPG, WebP</p>
        </div>
      )}

      {/* Labels list */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-stone-700">Labels</p>
        <div className="flex flex-col gap-1.5">
          {labels.map((lbl) => (
            <div key={lbl._key} className="group/lbl flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-sky-400 shrink-0" />
              <input
                value={lbl.label}
                onChange={(e) => updateLabel(lbl._key, 'label', e.target.value)}
                placeholder="Label text…"
                className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <button
                onClick={() => removeLabel(lbl._key)}
                className="hidden text-stone-300 hover:text-red-500 group-hover/lbl:block transition-colors"
                aria-label="Remove label"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          {labels.length === 0 && (
            <p className="text-xs text-stone-400 italic">No labels — drag boxes on the image after adding one.</p>
          )}
        </div>
        <button
          type="button"
          onClick={addLabel}
          className="self-start text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
        >
          + Add label
        </button>
      </div>

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      <Button
        loading={loading || uploading}
        disabled={!canSave}
        onClick={handleSave}
        className="self-end"
      >
        {uploading ? 'Uploading…' : 'Save card'}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CardEditor (thin orchestrator)
// ---------------------------------------------------------------------------

export default function CardEditor({ mode, setId, userId, card, onSave, onDelete }: CardEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isEditing = !!card

  const save = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true)
      setError('')
      try {
        const url = isEditing ? `/cards/${card!.id}` : '/cards'
        const method = isEditing ? 'PATCH' : 'POST'
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(isEditing ? body : { set_id: setId, type: mode, ...body }),
        })
        if (!res.ok) {
          const j = await res.json()
          throw new Error(j.error ?? 'Failed to save')
        }
        const saved: Card = await res.json()
        onSave(saved)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setSaving(false)
      }
    },
    [isEditing, card, setId, mode, onSave]
  )

  async function handleDelete() {
    if (!card || !onDelete) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/cards/${card.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onDelete(card.id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {mode === 'flashcard' ? (
        <FlashcardEditor
          initialFront={card?.type === 'flashcard' ? card.front : ''}
          initialBack={card?.type === 'flashcard' ? card.back : ''}
          onSubmit={(front, back) => save({ front, back })}
          loading={saving}
        />
      ) : (
        <DiagramEditor
          initialImageUrl={card?.type === 'diagram' ? card.image_url : ''}
          initialLabels={card?.type === 'diagram' ? card.labels : []}
          userId={userId}
          onSubmit={(imageUrl, labels) => save({ image_url: imageUrl, labels })}
          loading={saving}
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Delete */}
      {isEditing && onDelete && (
        <div className="border-t border-stone-100 pt-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-500 flex-1">Delete this card?</p>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-stone-400 hover:text-red-600 transition-colors"
            >
              Delete card
            </button>
          )}
        </div>
      )}
    </div>
  )
}
