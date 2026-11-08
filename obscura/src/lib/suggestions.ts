import type { Card, DiagramCard, FlashCard, Label } from '@/types'

// Suggested fixes: a student studying someone else's set proposes a change to
// one card, and the set's owner applies or dismisses it. Pure helpers only;
// the Supabase calls live in suggestionsApi.ts.

export type SuggestionKind = 'wording' | 'wrong_answer' | 'label' | 'other'
export type SuggestionStatus = 'open' | 'applied' | 'dismissed'

export const NOTE_MAX = 1000
export const TEXT_MAX = 5000
export const LABEL_MAX = 200
/** Matches the per-author limit in the card_suggestions insert trigger. */
export const DAILY_LIMIT = 20

/** A row of public.card_suggestions. Null fields were left as they were. */
export interface CardSuggestion {
  id: string
  set_id: string
  card_id: string
  author_id: string
  kind: SuggestionKind
  suggested_front: string | null
  suggested_back: string | null
  suggested_labels: string[] | null
  note: string | null
  status: SuggestionStatus
  created_at: string
  resolved_at: string | null
}

/** What the owner's review list shows: the row plus who sent it. */
export interface ReviewSuggestion extends CardSuggestion {
  author_name: string | null
}

export type SuggestionInsert = Pick<CardSuggestion, 'set_id' | 'card_id' | 'kind' | 'suggested_front' | 'suggested_back' | 'suggested_labels' | 'note'>

const KIND_LABELS: Record<SuggestionKind, string> = {
  wording: 'Wording',
  wrong_answer: 'Wrong answer',
  label: 'Wrong label',
  other: 'Other',
}

/** The kinds that make sense for a card, most likely first. */
export function kindsFor(type: Card['type']): SuggestionKind[] {
  return type === 'flashcard' ? ['wording', 'wrong_answer', 'other'] : ['label', 'other']
}

export function kindLabel(kind: SuggestionKind): string {
  return KIND_LABELS[kind] ?? KIND_LABELS.other
}

// ── Diagram labels as text ────────────────────────────────────────────────

/** One label per line, in the card's order. */
export function labelsToText(labels: Label[]): string {
  return labels.map((l) => l.label).join('\n')
}

/** Lines back into label text. Blank lines at the end are dropped; inner ones are kept so positions still line up. */
export function textToLabels(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim())
  while (lines.length && !lines[lines.length - 1]) lines.pop()
  return lines
}

// ── The student's draft ───────────────────────────────────────────────────

export interface SuggestionDraft {
  kind: SuggestionKind
  front: string
  back: string
  /** Diagram label text, one per line. */
  labels: string
  note: string
}

export function initialDraft(card: Card): SuggestionDraft {
  return card.type === 'flashcard'
    ? { kind: kindsFor('flashcard')[0], front: card.front, back: card.back, labels: '', note: '' }
    : { kind: kindsFor('diagram')[0], front: '', back: '', labels: labelsToText(card.labels), note: '' }
}

const same = (a: string, b: string) => a.trim() === b.trim()

export type BuildResult = { ok: true; row: SuggestionInsert } | { ok: false; error: string }

/**
 * Checks a draft and turns it into a row. Only the fields the student
 * changed are stored, so applying it later can't undo the owner's other edits.
 */
export function buildSuggestion(card: Card, draft: SuggestionDraft): BuildResult {
  const note = draft.note.trim()
  if (note.length > NOTE_MAX) return { ok: false, error: `Keep the note under ${NOTE_MAX.toLocaleString('en-US')} characters.` }

  let suggested_front: string | null = null
  let suggested_back: string | null = null
  let suggested_labels: string[] | null = null

  if (card.type === 'flashcard') {
    if (!draft.front.trim() || !draft.back.trim()) return { ok: false, error: 'The question and the answer both need some text.' }
    if (draft.front.length > TEXT_MAX || draft.back.length > TEXT_MAX) return { ok: false, error: 'Keep the question and the answer under 5,000 characters each.' }
    if (!same(draft.front, card.front)) suggested_front = draft.front.trim()
    if (!same(draft.back, card.back)) suggested_back = draft.back.trim()
  } else {
    const lines = textToLabels(draft.labels)
    const count = card.labels.length
    if (lines.length !== count) {
      return { ok: false, error: `Keep one line per label. This diagram has ${count} ${count === 1 ? 'label' : 'labels'}.` }
    }
    if (lines.some((l) => !l)) return { ok: false, error: 'Every label needs some text.' }
    if (lines.some((l) => l.length > LABEL_MAX)) return { ok: false, error: `Keep each label under ${LABEL_MAX} characters.` }
    if (lines.some((l, i) => l !== card.labels[i].label.trim())) suggested_labels = lines
  }

  if (suggested_front === null && suggested_back === null && suggested_labels === null && !note) {
    return { ok: false, error: card.type === 'flashcard' ? 'Change the card, or add a note saying what’s wrong.' : 'Change a label, or add a note saying what’s wrong.' }
  }

  return {
    ok: true,
    row: { set_id: card.set_id, card_id: card.id, kind: draft.kind, suggested_front, suggested_back, suggested_labels, note: note || null },
  }
}

// ── Applying ──────────────────────────────────────────────────────────────

/** The card as it would read with the suggestion applied. */
export interface Proposal {
  front: string
  back: string
  labels: string[]
}

export function proposalFor(card: Card, s: Pick<CardSuggestion, 'suggested_front' | 'suggested_back' | 'suggested_labels'>): Proposal {
  if (card.type === 'flashcard') {
    return { front: s.suggested_front ?? card.front, back: s.suggested_back ?? card.back, labels: [] }
  }
  return { front: '', back: '', labels: s.suggested_labels ?? card.labels.map((l) => l.label) }
}

/** Whether applying would change the card at all — a note-only suggestion won't. */
export function changesCard(card: Card, p: Proposal): boolean {
  if (card.type === 'flashcard') return p.front !== card.front || p.back !== card.back
  return p.labels.length !== card.labels.length || p.labels.some((l, i) => l !== card.labels[i].label)
}

export type PatchResult = { ok: true; body: Partial<Pick<FlashCard, 'front' | 'back'>> | Pick<DiagramCard, 'labels'> } | { ok: false; error: string }

/** The PATCH /cards/{id} body for a proposal. Diagram labels keep their boxes; only the text changes. */
export function patchBody(card: Card, p: Proposal): PatchResult {
  if (card.type === 'flashcard') {
    if (!p.front.trim() || !p.back.trim()) return { ok: false, error: 'The question and the answer both need some text.' }
    const body: Partial<Pick<FlashCard, 'front' | 'back'>> = {}
    if (p.front !== card.front) body.front = p.front
    if (p.back !== card.back) body.back = p.back
    return { ok: true, body }
  }
  if (p.labels.length !== card.labels.length) {
    return { ok: false, error: 'This diagram’s labels have changed since the suggestion was sent, so it can’t be applied as is.' }
  }
  if (p.labels.some((l) => !l.trim())) return { ok: false, error: 'Every label needs some text.' }
  return { ok: true, body: { labels: card.labels.map((l, i) => ({ ...l, label: p.labels[i].trim() })) } }
}

// ── Diff ──────────────────────────────────────────────────────────────────

export interface DiffPart {
  type: 'same' | 'add' | 'del'
  text: string
}

// Past this many word pairs the table gets slow; show a plain before/after instead.
const DIFF_CELL_LIMIT = 250_000

/** A word-level diff from `before` to `after`. Whitespace sticks to the word before it. */
export function diffWords(before: string, after: string): DiffPart[] {
  if (before === after) return before ? [{ type: 'same', text: before }] : []
  const a = before.match(/\S+\s*|\s+/g) ?? []
  const b = after.match(/\S+\s*|\s+/g) ?? []

  if (a.length * b.length > DIFF_CELL_LIMIT) {
    return [
      ...(before ? [{ type: 'del' as const, text: before }] : []),
      ...(after ? [{ type: 'add' as const, text: after }] : []),
    ]
  }

  // Longest common subsequence, compared on the words without trailing space.
  const key = (t: string) => t.trimEnd()
  const n = a.length
  const m = b.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = key(a[i]) === key(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const parts: DiffPart[] = []
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1]
    if (last && last.type === type) last.text += text
    else parts.push({ type, text })
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) { push('same', b[j]); i++; j++ }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) push('del', a[i++])
    else push('add', b[j++])
  }
  while (i < n) push('del', a[i++])
  while (j < m) push('add', b[j++])
  return parts
}

// ── Errors in plain words ─────────────────────────────────────────────────

interface DbError {
  code?: string
  message?: string
}

/** What went wrong sending a suggestion, said so a student knows what to do. */
export function suggestionErrorMessage(err: DbError | null | undefined): string {
  const code = err?.code ?? ''
  const message = err?.message ?? ''
  if (message.includes('suggestion_rate_limit')) return `You’ve sent ${DAILY_LIMIT} suggestions today. You can send more tomorrow.`
  if (message.includes('suggestion_label_too_long')) return `Keep each label under ${LABEL_MAX} characters.`
  // Row-level security: the set went private, or the sender owns it.
  if (code === '42501') return 'This set isn’t shared anymore, so it can’t take suggestions.'
  if (code === '23503') return 'This card was removed from the set.'
  if (code === '23514') return 'Your suggestion is too long. Shorten it and try again.'
  // The table isn't there yet (migration not applied).
  if (code === '42P01' || code === 'PGRST205') return 'Suggestions aren’t available yet. Please try again later.'
  return 'Couldn’t send your suggestion. Check your connection and try again.'
}
