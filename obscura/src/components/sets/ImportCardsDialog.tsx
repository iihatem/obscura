'use client'

import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { Check, ClipboardPaste, FileUp, TriangleAlert } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiUnavailableError, errorMessage, withColdStartRetry } from '@/lib/api'
import {
  MAX_FIELD_LENGTH, fileKind, issuesFor, parseCards, prepareSource, toBulkChunks,
  type FieldSeparator, type ImportRow, type RowSeparator, type Separators, type Source,
} from '@/lib/importCards'
import { cn, plural } from '@/lib/utils'

type Mode = 'paste' | 'file'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const PREVIEW_COUNT = 5
const FIX_LIST_COUNT = 10

const FIELD_OPTIONS: { value: FieldSeparator; label: string }[] = [
  { value: 'tab', label: 'Tab' },
  { value: 'dash', label: 'Dash' },
  { value: 'comma', label: 'Comma' },
  { value: 'custom', label: 'Custom' },
]
const ROW_OPTIONS: { value: RowSeparator; label: string }[] = [
  { value: 'newline', label: 'New line' },
  { value: 'semicolon', label: 'Semicolon' },
  { value: 'custom', label: 'Custom' },
]

interface LoadedFile {
  name: string
  text: string
  origin: Exclude<Source['origin'], 'paste'>
}

/** Fixes and skips belong to one parse; a new parse starts them fresh. */
interface Review {
  key: string
  fixes: Record<number, { front: string; back: string }>
  skipped: number[]
}

interface ImportCardsDialogProps {
  open: boolean
  onClose: () => void
  setId: string
  onImported: (count: number) => void
}

export default function ImportCardsDialog({ open, onClose, setId, onImported }: ImportCardsDialogProps) {
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('paste')
  const [pasted, setPasted] = useState('')
  const [file, setFile] = useState<LoadedFile | null>(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // The student's own separators; until they pick, the detected ones apply.
  const [chosen, setChosen] = useState<Separators | null>(null)

  const deferredPaste = useDeferredValue(pasted)
  const source: Source | null = mode === 'paste'
    ? (deferredPaste.trim() ? { text: deferredPaste, origin: 'paste' } : null)
    : file

  const prepared = useMemo(() => (source ? prepareSource(source) : null), [source?.text, source?.origin]) // eslint-disable-line react-hooks/exhaustive-deps
  const separators = chosen ?? prepared?.separators ?? { field: 'tab', row: 'newline' }
  const parsed = useMemo(
    () => (source && prepared ? parseCards(source.text, { ...separators, ...prepared.fixed }) : null),
    [source?.text, prepared, separators.field, separators.row, separators.customField, separators.customRow] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reviewKey = `${mode}|${source?.text ?? ''}|${JSON.stringify(separators)}`
  const [reviewState, setReview] = useState<Review>({ key: '', fixes: {}, skipped: [] })
  const review = useMemo<Review>(
    () => (reviewState.key === reviewKey ? reviewState : { key: reviewKey, fixes: {}, skipped: [] }),
    [reviewState, reviewKey]
  )

  const rows: ImportRow[] = useMemo(() => {
    if (!parsed) return []
    const skipped = new Set(review.skipped)
    return parsed.rows
      .filter((r) => !skipped.has(r.index))
      .map((r) => {
        const fix = review.fixes[r.index]
        return fix ? { ...r, ...fix, issues: issuesFor(fix.front, fix.back) } : r
      })
  }, [parsed, review])
  const ready = rows.filter((r) => r.issues.length === 0)
  // Rows that were flagged by the parse stay in the fix list while being edited.
  const flaggedByParse = useMemo(() => new Set(parsed?.rows.filter((r) => r.issues.length).map((r) => r.index)), [parsed])
  const needsReview = rows.filter((r) => flaggedByParse.has(r.index))
  const unresolved = rows.filter((r) => r.issues.length > 0)

  // ── Saving ──
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Cards already saved, so a retry after a failed batch carries on from there.
  const [savedCount, setSavedCount] = useState(0)
  const locked = saving || savedCount > 0

  function reset() {
    setMode('paste')
    setPasted('')
    setFile(null)
    setFileError('')
    setChosen(null)
    setSavedCount(0)
    setSaveError('')
  }

  function updateReview(change: (r: Review) => Review) {
    setReview(change(review))
  }

  function fixRow(row: ImportRow, side: 'front' | 'back', value: string) {
    // `row` already shows any earlier fix, so it carries the other side.
    updateReview((r) => ({
      ...r,
      fixes: { ...r.fixes, [row.index]: { front: row.front, back: row.back, [side]: value.slice(0, MAX_FIELD_LENGTH) } },
    }))
  }

  function skipRows(indexes: number[]) {
    updateReview((r) => ({ ...r, skipped: [...r.skipped, ...indexes] }))
  }

  function setSeparator(change: Partial<Separators>) {
    setChosen({ ...separators, ...change })
  }

  async function loadFile(f: File) {
    setFileError('')
    const kind = fileKind(f.name)
    if (kind === 'apkg') {
      setFileError('Obscura can’t open Anki deck packages (.apkg). In Anki, choose File → Export → “Notes in Plain Text”, then upload that .txt file.')
      return
    }
    if (kind === 'unsupported') {
      setFileError('Upload a .csv, .tsv or .txt file.')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError('That file is over 5 MB. Split it into smaller files and import them one at a time.')
      return
    }
    try {
      const text = await f.text()
      setChosen(null)
      setFile({ name: f.name, text, origin: kind })
    } catch {
      setFileError('Couldn’t read that file. Try saving it again as plain text.')
    }
  }

  async function handleImport() {
    const batches = toBulkChunks(ready.slice(savedCount))
    if (!batches.length) return
    setSaving(true)
    setSaveError('')
    let saved = savedCount
    try {
      for (const cards of batches) {
        const res = await withColdStartRetry(() => apiFetch('/cards/bulk', {
          method: 'POST',
          body: JSON.stringify({ set_id: setId, cards }),
        }))
        if (!res.ok) throw new Error(await errorMessage(res, 'Couldn’t save the cards. Please try again.'))
        saved += cards.length
        setSavedCount(saved)
      }
      toast(`Imported ${plural(saved, 'card')}`)
      reset()
      onImported(saved)
    } catch (err) {
      const msg = err instanceof ApiUnavailableError ? 'The study server didn’t answer. Try again in a few seconds.' : (err as Error).message
      setSaveError(saved > 0 ? `${plural(saved, 'card')} of ${ready.length} imported. The rest didn’t save: ${msg}` : msg)
    } finally {
      setSaving(false)
    }
  }

  function close() {
    if (saving) return
    // Cards from a half-finished import are already in the set; show them.
    if (savedCount > 0) {
      const n = savedCount
      reset()
      onImported(n)
      return
    }
    onClose()
  }

  const preview = ready.slice(0, PREVIEW_COUNT)
  const fixList = needsReview.slice(0, FIX_LIST_COUNT)
  const truncated = rows.filter((r) => r.truncated).length

  return (
    <Modal open={open} onClose={close} title="Import cards" description="Bring in flashcards you made in Quizlet, Anki or a spreadsheet." className="sm:max-w-2xl">
      <fieldset disabled={locked} className="flex min-w-0 flex-col gap-4">
        <SegmentedControl
          label="Import from"
          value={mode}
          onChange={(m) => { setMode(m); setChosen(null) }}
          options={[
            { value: 'paste', label: 'Paste text', icon: <ClipboardPaste className="h-4 w-4" aria-hidden /> },
            { value: 'file', label: 'Upload a file', icon: <FileUp className="h-4 w-4" aria-hidden /> },
          ]}
          className="self-start"
        />

        {mode === 'paste' ? (
          <Textarea
            label="Cards"
            hint="In Quizlet, open the set, choose ⋯ → Export, then copy the text and paste it here."
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'mitosis\tcell division\nATP\tthe cell’s energy store'}
            className="max-h-72 overflow-y-auto font-mono text-[13px]"
          />
        ) : (
          <div className="flex flex-col gap-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) loadFile(f)
              }}
              className={cn(
                'flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors',
                dragging ? 'border-accent bg-accent-soft/50' : 'border-line bg-paper'
              )}
            >
              <FileUp className="h-6 w-6 text-ink-muted" aria-hidden />
              {file ? (
                <p className="max-w-full truncate text-[15px] font-medium text-ink">{file.name}</p>
              ) : (
                <p className="text-[15px] text-ink">Drop a .csv, .tsv or .txt file here</p>
              )}
              <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                {file ? 'Choose another file' : 'Choose a file'}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.tsv,.txt,.apkg,text/csv,text/plain,text/tab-separated-values"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) loadFile(f)
                  e.target.value = ''
                }}
              />
            </div>
            {fileError ? (
              <p role="alert" className="rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{fileError}</p>
            ) : (
              <p className="text-[13px] text-ink-muted">From Anki? Choose File → Export → “Notes in Plain Text”, and upload the .txt file. Deck packages (.apkg) won’t open here.</p>
            )}
          </div>
        )}

        {source && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <p className="text-[13px] text-ink-muted">Separators are picked for you. Change them if the preview looks wrong.</p>
            <SeparatorRow label="Between question and answer">
              <SegmentedControl label="Between question and answer" size="sm" value={separators.field} options={FIELD_OPTIONS}
                onChange={(field) => setSeparator({ field })} />
              {separators.field === 'custom' && (
                <Input aria-label="Custom separator between question and answer" value={separators.customField ?? ''} placeholder="e.g. |"
                  onChange={(e) => setSeparator({ customField: e.target.value })} className="h-8 w-24 font-mono text-[13px]" />
              )}
            </SeparatorRow>
            <SeparatorRow label="Between cards">
              <SegmentedControl label="Between cards" size="sm" value={separators.row} options={ROW_OPTIONS}
                onChange={(row) => setSeparator({ row })} />
              {separators.row === 'custom' && (
                <Input aria-label="Custom separator between cards" value={separators.customRow ?? ''} placeholder="e.g. ##"
                  onChange={(e) => setSeparator({ customRow: e.target.value })} className="h-8 w-24 font-mono text-[13px]" />
              )}
            </SeparatorRow>
          </div>
        )}

        {parsed && (
          <section aria-label="Preview" className="flex flex-col gap-3">
            <p aria-live="polite" className="font-headline text-[17px] font-bold text-ink">
              {ready.length ? `${plural(ready.length, 'card')} ready` : 'No cards found yet'}
              {unresolved.length > 0 && <span className="font-sans text-sm font-medium text-warn"> · {unresolved.length} missing a side</span>}
            </p>

            {preview.length > 0 && (
              <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {preview.map((r) => (
                  <li key={r.index} className="grid gap-1 px-4 py-3 sm:grid-cols-2 sm:gap-4">
                    <p className="line-clamp-3 whitespace-pre-line text-[15px] font-medium text-ink">{r.front}</p>
                    <p className="line-clamp-3 whitespace-pre-line text-[15px] text-ink-muted">{r.back}</p>
                  </li>
                ))}
              </ol>
            )}
            {ready.length > PREVIEW_COUNT && (
              <p className="text-[13px] text-ink-muted">And {plural(ready.length - PREVIEW_COUNT, 'more card')}.</p>
            )}
            {truncated > 0 && (
              <p className="text-[13px] text-ink-muted">
                {truncated === 1 ? '1 card had' : `${truncated} cards had`} a side over {MAX_FIELD_LENGTH.toLocaleString()} characters, so it was shortened to fit.
              </p>
            )}

            {needsReview.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-warn/40 bg-warn-soft/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="flex items-start gap-2 text-sm text-ink">
                    {unresolved.length > 0
                      ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
                      : <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-hidden />}
                    {unresolved.length > 0
                      ? `${plural(unresolved.length, 'card is', 'cards are')} missing a question or an answer. Fill them in or skip them.`
                      : 'All fixed.'}
                  </p>
                  {unresolved.length > 1 && (
                    <Button variant="secondary" size="sm" onClick={() => skipRows(unresolved.map((r) => r.index))}>Skip all {unresolved.length}</Button>
                  )}
                </div>
                <ul className="flex flex-col gap-3">
                  {fixList.map((r) => (
                    <li key={r.index} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink-muted">Card {r.index}</span>
                        <button type="button" onClick={() => skipRows([r.index])} className="text-[13px] font-medium text-ink-muted hover:text-ink hover:underline">Skip</button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input aria-label={`Question for card ${r.index}`} placeholder="Question" value={r.front}
                          onChange={(e) => fixRow(r, 'front', e.target.value)} error={r.issues.includes('no-front') ? 'Add a question' : undefined} />
                        <Input aria-label={`Answer for card ${r.index}`} placeholder="Answer" value={r.back}
                          onChange={(e) => fixRow(r, 'back', e.target.value)} error={r.issues.includes('no-back') ? 'Add an answer' : undefined} />
                      </div>
                    </li>
                  ))}
                </ul>
                {needsReview.length > FIX_LIST_COUNT && (
                  <p className="text-[13px] text-ink-muted">
                    And {needsReview.length - FIX_LIST_COUNT} more. If most cards look wrong, try a different separator above.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </fieldset>

      {saveError && <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{saveError}</p>}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
        {unresolved.length > 0 && !locked && (
          // Column-reverse on phones: order-last puts the hint above the buttons.
          <p className="order-last text-[13px] text-ink-muted sm:order-none sm:mr-auto">Fix or skip the flagged cards to import.</p>
        )}
        <Button variant="secondary" onClick={close} disabled={saving}>{savedCount > 0 ? 'Close' : 'Cancel'}</Button>
        <Button onClick={handleImport} loading={saving} disabled={!ready.length || unresolved.length > 0}>
          {saving
            ? `Importing ${savedCount ? `${savedCount} of ${ready.length}` : plural(ready.length, 'card')}…`
            : savedCount > 0 ? 'Import the rest' : ready.length ? `Import ${plural(ready.length, 'card')}` : 'Import cards'}
        </Button>
      </div>
    </Modal>
  )
}

function SeparatorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
