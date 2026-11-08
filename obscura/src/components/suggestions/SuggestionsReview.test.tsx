import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FlashCard } from '@/types'
import { ToastProvider } from '@/components/ui/Toast'
import type { ReviewSuggestion } from '@/lib/suggestions'
import SuggestionsReview from './SuggestionsReview'

const api = vi.hoisted(() => ({
  listOpenSuggestions: vi.fn(),
  resolveSuggestion: vi.fn(),
  apiFetch: vi.fn(),
}))
vi.mock('@/lib/suggestionsApi', () => ({ listOpenSuggestions: api.listOpenSuggestions, resolveSuggestion: api.resolveSuggestion }))
vi.mock('@/lib/api', () => ({
  apiFetch: api.apiFetch,
  errorMessage: async (_res: Response, fallback: string) => fallback,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const card: FlashCard = {
  id: 'c1', set_id: 's1', position: 0, created_at: '', type: 'flashcard',
  front: 'How many chambers?', back: 'Three', image_url: null, labels: null,
}

const suggestion: ReviewSuggestion = {
  id: 'g1', set_id: 's1', card_id: 'c1', author_id: 'u2', kind: 'wrong_answer',
  suggested_front: null, suggested_back: 'Four', suggested_labels: null, note: 'Slide 4',
  status: 'open', created_at: new Date().toISOString(), resolved_at: null, author_name: 'Sam',
}

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

beforeEach(() => {
  vi.clearAllMocks()
  api.listOpenSuggestions.mockResolvedValue([suggestion])
  api.resolveSuggestion.mockResolvedValue(undefined)
})

async function openReview() {
  const onCardUpdated = vi.fn()
  render(<ToastProvider><SuggestionsReview setId="s1" cards={[card]} onCardUpdated={onCardUpdated} /></ToastProvider>)
  fireEvent.click(await screen.findByRole('button', { name: '1 suggestion' }))
  return onCardUpdated
}

describe('SuggestionsReview', () => {
  it('shows nothing when there are no open suggestions', async () => {
    api.listOpenSuggestions.mockResolvedValue([])
    const { container } = render(<ToastProvider><SuggestionsReview setId="s1" cards={[card]} onCardUpdated={vi.fn()} /></ToastProvider>)
    await waitFor(() => expect(api.listOpenSuggestions).toHaveBeenCalled())
    expect(container.querySelector('button')).toBeNull()
  })

  it('shows who sent it, the change and the note', async () => {
    await openReview()
    expect(screen.getByText('From Sam')).toBeTruthy()
    expect(screen.getByText('Three').tagName).toBe('DEL')
    expect(screen.getByText('Four').tagName).toBe('INS')
    expect(screen.getByText('Slide 4')).toBeTruthy()
  })

  it('applies: patches only the changed field, then marks it applied', async () => {
    api.apiFetch.mockResolvedValue(json({ ...card, back: 'Four' }))
    const onCardUpdated = await openReview()
    fireEvent.click(screen.getByRole('button', { name: 'Apply', hidden: true }))
    expect(onCardUpdated).toHaveBeenCalledWith({ ...card, back: 'Four' })
    await waitFor(() => expect(api.resolveSuggestion).toHaveBeenCalledWith('g1', 'applied'))
    expect(api.apiFetch).toHaveBeenCalledWith('/cards/c1', { method: 'PATCH', body: JSON.stringify({ back: 'Four' }) })
    expect(screen.getByText('You’re all caught up.')).toBeTruthy()
  })

  it('puts the card and the suggestion back when the update fails', async () => {
    api.apiFetch.mockResolvedValue(json({}, false))
    const onCardUpdated = await openReview()
    fireEvent.click(screen.getByRole('button', { name: 'Apply', hidden: true }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Couldn’t update the card. Please try again.'))
    expect(onCardUpdated).toHaveBeenLastCalledWith(card)
    expect(api.resolveSuggestion).not.toHaveBeenCalled()
    expect(screen.getByText('From Sam')).toBeTruthy()
  })

  it('applies an edited version', async () => {
    api.apiFetch.mockResolvedValue(json({ ...card, back: 'Four (two atria, two ventricles)' }))
    await openReview()
    fireEvent.click(screen.getByRole('button', { name: 'Edit and apply', hidden: true }))
    fireEvent.change(screen.getByLabelText('Answer', { selector: 'textarea' }), { target: { value: 'Four (two atria, two ventricles)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply edited version', hidden: true }))
    await waitFor(() => expect(api.resolveSuggestion).toHaveBeenCalledWith('g1', 'applied'))
    expect(api.apiFetch).toHaveBeenCalledWith('/cards/c1', { method: 'PATCH', body: JSON.stringify({ back: 'Four (two atria, two ventricles)' }) })
  })

  it('dismisses without touching the card', async () => {
    await openReview()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss', hidden: true }))
    await waitFor(() => expect(api.resolveSuggestion).toHaveBeenCalledWith('g1', 'dismissed'))
    expect(api.apiFetch).not.toHaveBeenCalled()
  })
})
