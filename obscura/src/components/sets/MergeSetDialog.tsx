'use client'

import { useEffect, useState } from 'react'
import { Check, Search, TriangleAlert } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, ApiUnavailableError, errorMessage, withColdStartRetry } from '@/lib/api'
import { planMerge, type MergePlan, type SourceCard } from '@/lib/mergeSets'
import { BULK_LIMIT, chunk } from '@/lib/importCards'
import { cn, plural } from '@/lib/utils'

interface SetSummary {
  id: string
  title: string
  subject: string | null
  card_count: number
}

export interface MergeResult {
  destId: string
  destTitle: string
  /** The student also deleted the set they merged from. */
  deletedSource: boolean
}

interface MergeSetDialogProps {
  open: boolean
  onClose: () => void
  source: { id: string; title: string; card_count: number }
  onDone: (result: MergeResult) => void
}

type Step = 'pick' | 'copying' | 'done'

/** Supabase returns at most this many rows per request. */
const PAGE = 1000

async function loadCards(setId: string): Promise<SourceCard[]> {
  const supabase = createClient()
  const all: SourceCard[] = []
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
    const { data, error } = await (supabase.from('cards') as any)
      .select('id, type, position, front, back, image_url, labels, source_page')
      .eq('set_id', setId)
      .order('type').order('position').order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error('Couldn’t read the cards in this set. Please try again.')
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) return all
  }
}

export default function MergeSetDialog({ open, onClose, source, onDone }: MergeSetDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('pick')
  const [sets, setSets] = useState<SetSummary[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [destId, setDestId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<MergePlan | null>(null)
  // Cards copied so far, so a retry after a failed batch carries on from there.
  const [copied, setCopied] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const dest = sets?.find((s) => s.id === destId) ?? null

  useEffect(() => {
    if (!open || sets) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
      const { data, error } = await (supabase.from('sets') as any)
        .select('id, title, subject, card_count')
        .eq('owner_id', session.user.id)
        .neq('id', source.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      if (!cancelled) setSets(data ?? [])
    })().catch(() => { if (!cancelled) setLoadError('Couldn’t load your sets. Close this and try again.') })
    return () => { cancelled = true }
  }, [open, sets, source.id])

  function reset() {
    setStep('pick')
    setSets(null)
    setLoadError('')
    setQuery('')
    setDestId(null)
    setError('')
    setPlan(null)
    setCopied(0)
  }

  async function copy() {
    if (!dest) return
    setError('')
    setStep('copying')
    let done = copied
    let current = plan
    try {
      if (!current) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sign in again to merge sets.')
        current = planMerge(await loadCards(source.id), session.user.id, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
        setPlan(current)
      }
      if (current.total === 0) throw new Error('None of these cards can be copied.')
      const remaining = current.chunks.flat().slice(done)
      for (const cards of chunk(remaining, BULK_LIMIT)) {
        const res = await withColdStartRetry(() => apiFetch('/cards/bulk', {
          method: 'POST',
          body: JSON.stringify({ set_id: dest.id, cards }),
        }))
        if (!res.ok) throw new Error(await errorMessage(res, 'Couldn’t copy the cards. Please try again.'))
        done += cards.length
        setCopied(done)
      }
      setStep('done')
    } catch (err) {
      const msg = err instanceof ApiUnavailableError ? 'The study server didn’t answer. Try again in a few seconds.' : (err as Error).message
      setError(done > 0 && current ? `${done} of ${current.total} cards copied. The rest didn’t copy: ${msg}` : msg)
      setStep('pick')
    }
  }

  function finish(deletedSource: boolean) {
    if (!dest) return
    const result = { destId: dest.id, destTitle: dest.title, deletedSource }
    reset()
    onDone(result)
  }

  async function deleteSource() {
    setDeleting(true)
    try {
      const res = await apiFetch(`/sets/${source.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await errorMessage(res, 'Couldn’t delete the set. Please try again.'))
      toast(`Deleted “${source.title}”`)
      finish(true)
    } catch (err) {
      toast(err instanceof ApiUnavailableError ? 'The study server didn’t answer. Try again in a few seconds.' : (err as Error).message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  function close() {
    if (step === 'copying' || deleting) return
    // Closing after the copy keeps the original: the safe default.
    if (step === 'done') { finish(false); return }
    // Cards already copied by a half-finished merge are in the other set; say so.
    if (copied > 0 && dest) toast(`${plural(copied, 'card')} copied to “${dest.title}”`, 'info')
    reset()
    onClose()
  }

  const q = query.trim().toLowerCase()
  const visible = (sets ?? []).filter((s) => !q || s.title.toLowerCase().includes(q) || s.subject?.toLowerCase().includes(q))
  const stayedBehind = plan?.skipped ?? 0

  if (step === 'done' && dest && plan) {
    return (
      <Modal open={open} onClose={close} title="Cards copied" className="sm:max-w-lg">
        <p className="text-[15px] text-ink">
          <Check className="mr-1.5 inline h-4 w-4 text-good" aria-hidden />
          {plural(plan.total, 'card')} copied to “{dest.title}”.
        </p>
        {stayedBehind > 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            {plural(stayedBehind, 'card')} stayed behind. Diagrams in a set you copied from a classmate use their image, so they can’t be moved.
          </p>
        )}
        <div className="mt-5 rounded-2xl border border-bad/30 bg-bad-soft/40 p-4">
          <h3 className="flex items-center gap-2 font-headline text-[17px] font-bold text-ink">
            <TriangleAlert className="h-4 w-4 text-bad" aria-hidden />
            Delete the original set?
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            “{source.title}” and its study history will be gone for good.
            {stayedBehind > 0 ? ` The ${plural(stayedBehind, 'card')} that stayed behind will be lost too.` : ` The copies in “${dest.title}” stay.`}
            {' '}This can’t be undone.
          </p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="danger" loading={deleting} onClick={deleteSource}>Delete the original</Button>
          <Button autoFocus disabled={deleting} onClick={() => finish(false)}>Keep both sets</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Merge into another set"
      description={`Copy the ${plural(source.card_count, 'card')} in “${source.title}” into one of your other sets. Nothing is deleted unless you choose to afterwards.`}
      className="sm:max-w-lg"
    >
      {loadError ? (
        <p role="alert" className="rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{loadError}</p>
      ) : !sets ? (
        <div className="flex flex-col gap-2" aria-busy>
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-paper-2" />)}
        </div>
      ) : sets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-muted">
          You don’t have another set to merge into yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sets.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a set"
                aria-label="Find a set"
                className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
              />
            </div>
          )}
          <div role="radiogroup" aria-label="Destination set" className="flex max-h-[45dvh] flex-col gap-2 overflow-y-auto sm:max-h-80">
            {visible.map((s) => {
              const selected = s.id === destId
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={step === 'copying' || copied > 0}
                  onClick={() => setDestId(s.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60',
                    selected ? 'border-accent bg-accent-soft/50' : 'border-line hover:border-ink-muted/50'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    {s.subject && <span className="block truncate text-xs font-semibold uppercase tracking-wider text-accent">{s.subject}</span>}
                    <span className="block truncate font-semibold text-ink">{s.title}</span>
                    <span className="block text-[13px] text-ink-muted">{plural(s.card_count, 'card')}</span>
                  </span>
                  {selected && <Check className="h-5 w-5 shrink-0 text-accent-ink" aria-hidden />}
                </button>
              )
            })}
            {visible.length === 0 && <p className="py-6 text-center text-ink-muted">No sets match “{query.trim()}”.</p>}
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{error}</p>}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close} disabled={step === 'copying'}>Cancel</Button>
        <Button onClick={copy} loading={step === 'copying'} disabled={!dest || source.card_count === 0}>
          {step === 'copying'
            ? (plan ? `Copying ${copied} of ${plan.total}…` : 'Copying…')
            : copied > 0 ? 'Copy the rest' : `Copy ${plural(source.card_count, 'card')}`}
        </Button>
      </div>
    </Modal>
  )
}
