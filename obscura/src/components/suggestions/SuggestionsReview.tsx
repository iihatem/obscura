'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquareDiff } from 'lucide-react'
import type { Card } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Textarea from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, errorMessage } from '@/lib/api'
import { relativeDate } from '@/lib/library'
import { plural, proxyImageUrl } from '@/lib/utils'
import {
  changesCard, diffWords, kindLabel, patchBody, proposalFor, textToLabels,
  type Proposal, type ReviewSuggestion,
} from '@/lib/suggestions'
import { listOpenSuggestions, resolveSuggestion } from '@/lib/suggestionsApi'

interface SuggestionsReviewProps {
  setId: string
  cards: Card[]
  /** Called with the card as it now reads, first optimistically, then as saved. */
  onCardUpdated: (card: Card) => void
}

const byDate = (a: ReviewSuggestion, b: ReviewSuggestion) => a.created_at.localeCompare(b.created_at)

/**
 * The owner's "N suggestions" button and the dialog to work through them.
 * Renders nothing while there are none, or if suggestions can't be loaded.
 */
export default function SuggestionsReview({ setId, cards, onCardUpdated }: SuggestionsReviewProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<ReviewSuggestion[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(() => {
    // Quietly empty on failure: the button is a nudge, not something to error about.
    listOpenSuggestions(setId).then(setItems).catch(() => setItems([]))
  }, [setId])

  useEffect(() => { load() }, [load])

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])

  const remove = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id))
  const restore = (s: ReviewSuggestion) => setItems((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s].sort(byDate)))

  async function apply(s: ReviewSuggestion, proposal: Proposal) {
    const card = cardsById.get(s.card_id)
    if (!card) return
    const patch = changesCard(card, proposal) ? patchBody(card, proposal) : null
    if (patch && !patch.ok) { toast(patch.error, 'error'); return }

    remove(s.id)
    if (patch) {
      onCardUpdated({ ...card, ...patch.body } as Card)
      try {
        const res = await apiFetch(`/cards/${card.id}`, { method: 'PATCH', body: JSON.stringify(patch.body) })
        if (!res.ok) throw new Error(await errorMessage(res, 'Couldn’t update the card. Please try again.'))
        onCardUpdated(await res.json())
      } catch (err) {
        onCardUpdated(card)
        restore(s)
        toast(err instanceof Error ? err.message : 'Couldn’t update the card. Please try again.', 'error')
        return
      }
    }

    try {
      await resolveSuggestion(s.id, 'applied')
      toast(patch ? 'Card updated' : 'Marked as fixed')
    } catch {
      restore(s)
      toast(patch ? 'The card is updated, but the suggestion is still open. Apply it again to close it.' : 'Couldn’t mark it as fixed. Please try again.', 'error')
    }
  }

  async function dismiss(s: ReviewSuggestion) {
    remove(s.id)
    try {
      await resolveSuggestion(s.id, 'dismissed')
      toast('Suggestion dismissed')
    } catch {
      restore(s)
      toast('Couldn’t dismiss the suggestion. Please try again.', 'error')
    }
  }

  function openReview() {
    setOpen(true)
    load()
  }

  if (!items.length && !open) return null

  return (
    <>
      {items.length > 0 && (
        <button
          type="button"
          onClick={openReview}
          className="inline-flex items-center gap-1 rounded-full font-medium text-accent-ink hover:underline"
        >
          <MessageSquareDiff className="h-3.5 w-3.5" aria-hidden />
          {plural(items.length, 'suggestion')}
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Suggested fixes"
        description="Students who studied this set sent these. Applying one changes the card for everyone who studies it."
        className="sm:max-w-2xl"
      >
        {items.length === 0 ? (
          <p className="py-8 text-center text-ink-muted">You’re all caught up.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((s) => (
              <SuggestionItem key={s.id} s={s} card={cardsById.get(s.card_id)} onApply={(p) => apply(s, p)} onDismiss={() => dismiss(s)} />
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}

// ── One suggestion ─────────────────────────────────────────────────────────

function SuggestionItem({ s, card, onApply, onDismiss }: {
  s: ReviewSuggestion
  card: Card | undefined
  onApply: (p: Proposal) => void
  onDismiss: () => void
}) {
  const [editing, setEditing] = useState<Proposal | null>(null)
  const proposal = card ? proposalFor(card, s) : null
  const changes = card && proposal ? changesCard(card, proposal) : false

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
        <Badge variant="accent">{kindLabel(s.kind)}</Badge>
        <span>From {s.author_name?.trim() || 'a student'}</span>
        <span aria-hidden>·</span>
        <span>{relativeDate(s.created_at)}</span>
      </div>

      {!card || !proposal ? (
        <p className="text-sm text-ink-muted">This card isn’t in the set anymore.</p>
      ) : editing ? (
        <EditProposal card={card} value={editing} onChange={setEditing} />
      ) : card.type === 'flashcard' ? (
        <div className="flex flex-col gap-3">
          {changes ? (
            <>
              {proposal.front !== card.front && <Compare label="Question" before={card.front} after={proposal.front} />}
              {proposal.back !== card.back && <Compare label="Answer" before={card.back} after={proposal.back} />}
            </>
          ) : (
            <p className="line-clamp-2 text-sm text-ink"><span className="text-ink-muted">Card: </span>{card.front}</p>
          )}
        </div>
      ) : (
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proxyImageUrl(card.image_url)} alt="" className="h-16 w-20 shrink-0 rounded-lg border border-line object-cover" />
          <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
            {changes ? proposal.labels.map((l, i) => {
              const before = card.labels[i]?.label ?? ''
              return l === before ? null : (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] text-ink-muted">Label {i + 1}</span>
                  <del className="rounded bg-bad-soft px-1 text-bad">{before}</del>
                  <span className="text-ink-muted" aria-hidden>→</span>
                  <ins className="rounded bg-good-soft px-1 font-medium text-good no-underline">{l}</ins>
                </li>
              )
            }) : <li className="text-ink-muted">{plural(card.labels.length, 'label')}, no label changes</li>}
          </ul>
        </div>
      )}

      {s.note && (
        <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-line pl-3 text-sm text-ink">{s.note}</blockquote>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" onClick={() => onApply(editing)}>Apply edited version</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
            {card && proposal && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditing(proposal)}>Edit and apply</Button>
                <Button size="sm" onClick={() => onApply(proposal)}>{changes ? 'Apply' : 'Mark as fixed'}</Button>
              </>
            )}
          </>
        )}
      </div>
    </li>
  )
}

/** The current text and the suggested one, with what changed highlighted on each side. */
function Compare({ label, before, after }: { label: string; before: string; after: string }) {
  const parts = diffWords(before, after)
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-paper px-3 py-2">
          <p className="mb-0.5 text-[12px] text-ink-muted">Now</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {parts.map((p, i) => p.type === 'add' ? null : p.type === 'del'
              ? <del key={i} className="rounded bg-bad-soft text-bad">{p.text}</del>
              : <span key={i}>{p.text}</span>)}
          </p>
        </div>
        <div className="rounded-xl bg-paper px-3 py-2">
          <p className="mb-0.5 text-[12px] text-ink-muted">Suggested</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {parts.map((p, i) => p.type === 'del' ? null : p.type === 'add'
              ? <ins key={i} className="rounded bg-good-soft font-medium text-good no-underline">{p.text}</ins>
              : <span key={i}>{p.text}</span>)}
          </p>
        </div>
      </div>
    </div>
  )
}

function EditProposal({ card, value, onChange }: { card: Card; value: Proposal; onChange: (p: Proposal) => void }) {
  // The raw text, so a new line being typed at the end isn't trimmed away.
  const [labelText, setLabelText] = useState(() => value.labels.join('\n'))
  if (card.type === 'flashcard') {
    return (
      <div className="flex flex-col gap-3">
        <Textarea label="Question" maxLength={5000} value={value.front} onChange={(e) => onChange({ ...value, front: e.target.value })} />
        <Textarea label="Answer" maxLength={5000} value={value.back} onChange={(e) => onChange({ ...value, back: e.target.value })} />
      </div>
    )
  }
  return (
    <Textarea
      label="Labels"
      hint={`One per line, in the same order. This diagram has ${plural(card.labels.length, 'label')}.`}
      value={labelText}
      onChange={(e) => { setLabelText(e.target.value); onChange({ ...value, labels: textToLabels(e.target.value) }) }}
    />
  )
}
