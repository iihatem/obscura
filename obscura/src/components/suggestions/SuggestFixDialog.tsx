'use client'

import { useState } from 'react'
import type { Card } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import {
  NOTE_MAX, TEXT_MAX, buildSuggestion, initialDraft, kindLabel, kindsFor,
  suggestionErrorMessage, type SuggestionDraft, type SuggestionInsert,
} from '@/lib/suggestions'
import { sendSuggestion, type DbError } from '@/lib/suggestionsApi'

interface SuggestFixDialogProps {
  /** The card being fixed; null keeps the dialog closed. */
  card: Card | null
  onClose: () => void
  /** Sends the row. Swappable for tests. */
  send?: (row: SuggestionInsert) => Promise<DbError | null>
}

export default function SuggestFixDialog({ card, onClose, send = sendSuggestion }: SuggestFixDialogProps) {
  return (
    <Modal
      open={card !== null}
      onClose={onClose}
      title="Suggest a fix"
      description="The set’s owner reviews it and decides whether to change the card."
      className="sm:max-w-lg"
    >
      {/* Keyed so each card starts from its own text. */}
      {card && <SuggestFixForm key={card.id} card={card} onDone={onClose} send={send} />}
    </Modal>
  )
}

function SuggestFixForm({ card, onDone, send }: { card: Card; onDone: () => void; send: NonNullable<SuggestFixDialogProps['send']> }) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<SuggestionDraft>(() => initialDraft(card))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  function update(patch: Partial<SuggestionDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    setError('')
  }

  async function submit() {
    const built = buildSuggestion(card, draft)
    if (!built.ok) { setError(built.error); return }
    setSending(true)
    const err = await send(built.row)
    setSending(false)
    if (err) { setError(suggestionErrorMessage(err)); return }
    toast('Thanks — the set’s owner will see your suggestion.')
    onDone()
  }

  const labelCount = card.type === 'diagram' ? card.labels.length : 0

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => { e.preventDefault(); submit() }}
    >
      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-sm font-medium text-ink">What’s wrong?</span>
        <SegmentedControl
          label="What’s wrong?"
          size="sm"
          className="self-start"
          value={draft.kind}
          onChange={(kind) => update({ kind })}
          options={kindsFor(card.type).map((k) => ({ value: k, label: kindLabel(k) }))}
        />
      </div>

      {card.type === 'flashcard' ? (
        <>
          <Textarea label="Question" maxLength={TEXT_MAX} value={draft.front} onChange={(e) => update({ front: e.target.value })} />
          <Textarea label="Answer" maxLength={TEXT_MAX} value={draft.back} onChange={(e) => update({ back: e.target.value })} />
        </>
      ) : (
        <Textarea
          label="Labels"
          hint={`One per line, in the same order. This diagram has ${labelCount} ${labelCount === 1 ? 'label' : 'labels'}.`}
          value={draft.labels}
          onChange={(e) => update({ labels: e.target.value })}
          rows={Math.min(Math.max(labelCount, 2), 10)}
        />
      )}

      <Textarea
        label="Note (optional)"
        hint="Say what’s wrong, or where the right answer comes from."
        maxLength={NOTE_MAX}
        value={draft.note}
        onChange={(e) => update({ note: e.target.value })}
        placeholder="e.g. The lecture says four chambers, not three."
      />

      {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={sending}>Send suggestion</Button>
      </div>
    </form>
  )
}
