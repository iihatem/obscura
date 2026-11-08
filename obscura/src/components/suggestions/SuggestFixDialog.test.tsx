import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DiagramCard, FlashCard } from '@/types'
import { ToastProvider } from '@/components/ui/Toast'
import SuggestFixDialog from './SuggestFixDialog'

// The default sender would build a real Supabase client.
vi.mock('@/lib/suggestionsApi', () => ({ sendSuggestion: vi.fn() }))

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const flash: FlashCard = {
  id: 'c1', set_id: 's1', position: 0, created_at: '', type: 'flashcard',
  front: 'How many chambers does the heart have?', back: 'Three', image_url: null, labels: null,
}

const diagram: DiagramCard = {
  id: 'c2', set_id: 's1', position: 1, created_at: '', type: 'diagram', front: null, back: null,
  image_url: 'https://x/img.png',
  labels: [{ label: 'Aorta', x: 1, y: 1, width: 5, height: 5 }, { label: 'Vena cava', x: 9, y: 9, width: 5, height: 5 }],
}

function setup(card: FlashCard | DiagramCard, send = vi.fn().mockResolvedValue(null)) {
  const onClose = vi.fn()
  render(<ToastProvider><SuggestFixDialog card={card} onClose={onClose} send={send} /></ToastProvider>)
  const field = (name: string) => screen.getByLabelText(name, { selector: 'textarea' }) as HTMLTextAreaElement
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Send suggestion', hidden: true }))
  return { send, onClose, field, submit }
}

describe('SuggestFixDialog', () => {
  it('starts from the card’s current text', () => {
    const { field } = setup(flash)
    expect(field('Question').value).toBe(flash.front)
    expect(field('Answer').value).toBe('Three')
  })

  it('won’t send an unchanged card with no note', () => {
    const { send, submit } = setup(flash)
    submit()
    expect(screen.getByRole('alert', { hidden: true }).textContent).toBe('Change the card, or add a note saying what’s wrong.')
    expect(send).not.toHaveBeenCalled()
  })

  it('won’t send an emptied answer', () => {
    const { send, field, submit } = setup(flash)
    fireEvent.change(field('Answer'), { target: { value: '   ' } })
    submit()
    expect(screen.getByRole('alert', { hidden: true }).textContent).toMatch(/both need some text/)
    expect(send).not.toHaveBeenCalled()
  })

  it('sends the changed answer with the chosen kind, then thanks the student', async () => {
    const { send, onClose, field, submit } = setup(flash)
    fireEvent.click(screen.getByRole('radio', { name: 'Wrong answer', hidden: true }))
    fireEvent.change(field('Answer'), { target: { value: 'Four' } })
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(send).toHaveBeenCalledWith({
      set_id: 's1', card_id: 'c1', kind: 'wrong_answer',
      suggested_front: null, suggested_back: 'Four', suggested_labels: null, note: null,
    })
    expect(screen.getByRole('status').textContent).toBe('Thanks — the set’s owner will see your suggestion.')
  })

  it('shows the database’s refusal in plain words and stays open', async () => {
    const send = vi.fn().mockResolvedValue({ code: 'P0001', message: 'suggestion_rate_limit' })
    const { onClose, field, submit } = setup(flash, send)
    fireEvent.change(field('Note (optional)'), { target: { value: 'Check slide 4' } })
    submit()
    await waitFor(() => expect(screen.getByRole('alert', { hidden: true }).textContent).toBe('You’ve sent 20 suggestions today. You can send more tomorrow.'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('needs one line per diagram label', () => {
    const { send, field, submit } = setup(diagram)
    expect(field('Labels').value).toBe('Aorta\nVena cava')
    fireEvent.change(field('Labels'), { target: { value: 'Aorta\nSuperior vena cava\nRight atrium' } })
    submit()
    expect(screen.getByRole('alert', { hidden: true }).textContent).toBe('Keep one line per label. This diagram has 2 labels.')
    expect(send).not.toHaveBeenCalled()
  })

  it('clears the error once the student edits again', () => {
    const { field, submit } = setup(flash)
    submit()
    expect(screen.queryByRole('alert', { hidden: true })).not.toBeNull()
    fireEvent.change(field('Question'), { target: { value: 'How many heart chambers?' } })
    expect(screen.queryByRole('alert', { hidden: true })).toBeNull()
  })
})
