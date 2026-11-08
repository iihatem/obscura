import { describe, expect, it } from 'vitest'
import type { DiagramCard, FlashCard } from '@/types'
import {
  buildSuggestion, changesCard, diffWords, initialDraft, kindLabel, kindsFor,
  labelsToText, patchBody, proposalFor, suggestionErrorMessage, textToLabels,
} from './suggestions'

const flash: FlashCard = {
  id: 'c1', set_id: 's1', position: 0, created_at: '', type: 'flashcard',
  front: 'What does the mitochondria make?', back: 'ATP', image_url: null, labels: null,
}

const diagram: DiagramCard = {
  id: 'c2', set_id: 's1', position: 1, created_at: '', type: 'diagram', front: null, back: null,
  image_url: 'https://x/img.png',
  labels: [
    { label: 'Nucleus', x: 1, y: 2, width: 3, height: 4 },
    { label: 'Ribosome', x: 5, y: 6, width: 7, height: 8 },
  ],
}

const none = { suggested_front: null, suggested_back: null, suggested_labels: null }

describe('kinds', () => {
  it('offers kinds that fit the card type', () => {
    expect(kindsFor('flashcard')).toEqual(['wording', 'wrong_answer', 'other'])
    expect(kindsFor('diagram')).toEqual(['label', 'other'])
  })

  it('names every kind', () => {
    expect(kindLabel('wrong_answer')).toBe('Wrong answer')
    expect(kindLabel('label')).toBe('Wrong label')
    // An unknown value from an older or newer client still reads sensibly.
    expect(kindLabel('nope' as never)).toBe('Other')
  })
})

describe('label text', () => {
  it('round-trips one label per line', () => {
    expect(labelsToText(diagram.labels)).toBe('Nucleus\nRibosome')
    expect(textToLabels('  Nucleus \nRibosome\n\n')).toEqual(['Nucleus', 'Ribosome'])
  })

  it('keeps blank lines in the middle so positions line up', () => {
    expect(textToLabels('A\n\nC')).toEqual(['A', '', 'C'])
  })
})

describe('buildSuggestion', () => {
  it('stores only the fields that changed', () => {
    const draft = { ...initialDraft(flash), back: 'ATP, by oxidative phosphorylation' }
    const r = buildSuggestion(flash, draft)
    expect(r).toEqual({
      ok: true,
      row: { set_id: 's1', card_id: 'c1', kind: 'wording', suggested_front: null, suggested_back: 'ATP, by oxidative phosphorylation', suggested_labels: null, note: null },
    })
  })

  it('ignores whitespace-only edits', () => {
    const r = buildSuggestion(flash, { ...initialDraft(flash), front: `  ${flash.front}  ` })
    expect(r.ok).toBe(false)
  })

  it('accepts a note on its own', () => {
    const r = buildSuggestion(flash, { ...initialDraft(flash), kind: 'other', note: '  Source says ADP too ' })
    expect(r.ok && r.row.note).toBe('Source says ADP too')
  })

  it('asks for a change or a note', () => {
    const r = buildSuggestion(flash, initialDraft(flash))
    expect(r).toEqual({ ok: false, error: 'Change the card, or add a note saying what’s wrong.' })
  })

  it('rejects an emptied question or answer, and long notes', () => {
    expect(buildSuggestion(flash, { ...initialDraft(flash), back: ' ' }).ok).toBe(false)
    const long = buildSuggestion(flash, { ...initialDraft(flash), note: 'x'.repeat(1001) })
    expect(long).toEqual({ ok: false, error: 'Keep the note under 1,000 characters.' })
  })

  it('stores diagram labels in order when one changes', () => {
    const r = buildSuggestion(diagram, { ...initialDraft(diagram), labels: 'Nucleus\nRough ER' })
    expect(r.ok && r.row.suggested_labels).toEqual(['Nucleus', 'Rough ER'])
    expect(r.ok && r.row.kind).toBe('label')
  })

  it('needs one line per diagram label', () => {
    const r = buildSuggestion(diagram, { ...initialDraft(diagram), labels: 'Nucleus\nRibosome\nGolgi' })
    expect(r).toEqual({ ok: false, error: 'Keep one line per label. This diagram has 2 labels.' })
  })
})

describe('applying', () => {
  it('fills unchanged fields from the card', () => {
    expect(proposalFor(flash, { ...none, suggested_back: 'ATP!' })).toEqual({ front: flash.front, back: 'ATP!', labels: [] })
    expect(proposalFor(diagram, none).labels).toEqual(['Nucleus', 'Ribosome'])
  })

  it('knows when a suggestion leaves the card as it is', () => {
    expect(changesCard(flash, proposalFor(flash, none))).toBe(false)
    expect(changesCard(diagram, proposalFor(diagram, { ...none, suggested_labels: ['Nucleus', 'Rough ER'] }))).toBe(true)
  })

  it('patches only changed flashcard fields', () => {
    expect(patchBody(flash, { front: flash.front, back: 'ATP!', labels: [] })).toEqual({ ok: true, body: { back: 'ATP!' } })
  })

  it('keeps each label box and swaps only the text', () => {
    const r = patchBody(diagram, { front: '', back: '', labels: ['Nucleus', ' Rough ER '] })
    expect(r).toEqual({
      ok: true,
      body: { labels: [diagram.labels[0], { label: 'Rough ER', x: 5, y: 6, width: 7, height: 8 }] },
    })
  })

  it('refuses labels that no longer line up with the diagram', () => {
    const r = patchBody(diagram, { front: '', back: '', labels: ['Only one'] })
    expect(r.ok).toBe(false)
  })
})

describe('diffWords', () => {
  it('marks removed and added words', () => {
    expect(diffWords('The heart has three chambers', 'The heart has four chambers')).toEqual([
      { type: 'same', text: 'The heart has ' },
      { type: 'del', text: 'three ' },
      { type: 'add', text: 'four ' },
      { type: 'same', text: 'chambers' },
    ])
  })

  it('handles empty sides and identical text', () => {
    expect(diffWords('', 'new')).toEqual([{ type: 'add', text: 'new' }])
    expect(diffWords('old', '')).toEqual([{ type: 'del', text: 'old' }])
    expect(diffWords('same', 'same')).toEqual([{ type: 'same', text: 'same' }])
    expect(diffWords('', '')).toEqual([])
  })

  it('rebuilds both texts', () => {
    const before = 'ATP is made in the matrix.\nMostly.'
    const after = 'ATP is mostly made on the inner membrane.'
    const parts = diffWords(before, after)
    expect(parts.filter((p) => p.type !== 'add').map((p) => p.text).join('').replace(/\s+/g, ' ').trim()).toBe(before.replace(/\s+/g, ' '))
    expect(parts.filter((p) => p.type !== 'del').map((p) => p.text).join('')).toBe(after)
  })

  it('falls back to before and after for very long text', () => {
    const a = Array.from({ length: 600 }, (_, i) => `a${i}`).join(' ')
    const b = Array.from({ length: 600 }, (_, i) => `b${i}`).join(' ')
    expect(diffWords(a, b)).toEqual([{ type: 'del', text: a }, { type: 'add', text: b }])
  })
})

describe('suggestionErrorMessage', () => {
  it('says what to do in plain words', () => {
    expect(suggestionErrorMessage({ code: 'P0001', message: 'suggestion_rate_limit' })).toBe('You’ve sent 20 suggestions today. You can send more tomorrow.')
    expect(suggestionErrorMessage({ code: '42501', message: 'new row violates row-level security policy' })).toBe('This set isn’t shared anymore, so it can’t take suggestions.')
    expect(suggestionErrorMessage({ code: '23503' })).toBe('This card was removed from the set.')
    expect(suggestionErrorMessage({ code: 'PGRST205' })).toBe('Suggestions aren’t available yet. Please try again later.')
    expect(suggestionErrorMessage(null)).toMatch(/try again/)
  })
})
