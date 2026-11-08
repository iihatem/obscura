import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Card, FlashCard, Set } from '@/types'
import StudySession from './StudySession'
import { saveProgress } from '@/lib/studyProgress'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(() => Promise.reject(new Error('offline'))),
  withColdStartRetry: (fn: () => Promise<unknown>) => fn(),
}))

const set = { id: 's1', title: 'Cells', owner_id: 'u', visibility: 'private' } as Set
const card = (id: string): Card => ({ id, set_id: 's1', position: 0, created_at: '', type: 'flashcard', front: `Q ${id}`, back: `A ${id}`, image_url: null, labels: null })
const cards = ['a', 'b', 'c'].map(card)

describe('StudySession resume', () => {
  beforeEach(() => localStorage.clear())

  it('offers an unfinished session back and continues from the next card', async () => {
    saveProgress('s1', { mode: 'flashcard', deck: ['b', 'a', 'c'], answers: [{ cardId: 'b', grade: 'correct', time_taken_ms: 500 }], savedAt: Date.now() })
    render(<StudySession set={set} cards={cards} />)

    expect(await screen.findByText('Pick up where you stopped?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Continue from card 2/ }))

    expect(screen.getAllByText('Q a').length).toBeGreaterThan(0)
    expect(screen.getByText(/\/ 3/).parentElement?.textContent).toContain('2')
  })

  it('starts fresh when there is nothing saved', async () => {
    render(<StudySession set={set} cards={cards} />)
    expect(await screen.findByRole('button', { name: /^Show answer/ })).toBeTruthy()
    expect(screen.queryByText('Pick up where you stopped?')).toBeNull()
  })

  it('saves progress after each answer', async () => {
    render(<StudySession set={set} cards={cards} />)
    fireEvent.click(await screen.findByRole('button', { name: /^Show answer/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confident/ }))
    const saved = JSON.parse(localStorage.getItem('obscura:study:s1')!)
    expect(saved.answers).toHaveLength(1)
    expect(saved.deck).toHaveLength(3)
  })
})

describe('StudySession typed answers', () => {
  beforeEach(() => {
    localStorage.clear()
    // A desktop with a keyboard, so the answer box takes focus.
    window.matchMedia = vi.fn(() => ({ matches: true }) as unknown as MediaQueryList)
  })

  const short = (id: string, back: string): Card => ({ ...(card(id) as FlashCard), back })

  it('checks a typed answer, suggests a grade, and lets the student change it', async () => {
    render(<StudySession set={set} cards={[short('a', 'Mitochondria'), short('b', 'Mitochondria')]} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Type answers' }))
    expect(localStorage.getItem('obscura:typed-answers')).toBe('1')
    expect(screen.getByRole('button', { name: 'Type answers' }).getAttribute('aria-pressed')).toBe('true')

    const box = screen.getByRole('textbox', { name: 'Your answer' })
    fireEvent.change(box, { target: { value: 'mitocondrea' } })
    fireEvent.submit(box.closest('form')!)

    // Flipped, with the typed answer beside the real one and a suggested grade.
    expect(screen.getByText('Close')).toBeTruthy()
    expect(screen.getByText('mitocondrea')).toBeTruthy()
    expect(screen.getByText('Count it as…')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Almost (suggested)' })).toBeTruthy()

    // The student knows it was a typo and counts it as Confident instead.
    fireEvent.click(screen.getByRole('button', { name: /^Confident/ }))
    const saved = JSON.parse(localStorage.getItem('obscura:study:s1')!)
    expect(saved.answers[0].grade).toBe('correct')

    // On to the next card, with a fresh answer box.
    expect(screen.getByText(/\/ 2/).parentElement?.textContent).toContain('2')
    expect((screen.getByRole('textbox', { name: 'Your answer' }) as HTMLInputElement).value).toBe('')
  })

  it('accepts the suggested grade with Enter', async () => {
    localStorage.setItem('obscura:typed-answers', '1')
    render(<StudySession set={set} cards={[short('a', 'Nucleus'), short('b', 'Nucleus')]} />)

    const box = await screen.findByRole('textbox', { name: 'Your answer' })
    fireEvent.change(box, { target: { value: 'nucleus' } })
    fireEvent.submit(box.closest('form')!)
    expect(screen.getByText('Looks right')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Enter' })
    expect(JSON.parse(localStorage.getItem('obscura:study:s1')!).answers[0].grade).toBe('correct')
  })

  it('asks the student to grade long answers themselves', async () => {
    localStorage.setItem('obscura:typed-answers', '1')
    const long = 'It packages proteins and sends them on to the membrane'
    render(<StudySession set={set} cards={[short('a', long), short('b', long)]} />)

    const box = await screen.findByRole('textbox', { name: 'Your answer' })
    fireEvent.change(box, { target: { value: 'it packages proteins' } })
    fireEvent.submit(box.closest('form')!)

    expect(screen.getByText('Compare the two, then grade yourself')).toBeTruthy()
    expect(screen.queryByText(/\(suggested\)/)).toBeNull()
    fireEvent.keyDown(window, { key: '2' })
    expect(JSON.parse(localStorage.getItem('obscura:study:s1')!).answers[0].grade).toBe('close')
  })

  it("counts I don't know as Need review", async () => {
    localStorage.setItem('obscura:typed-answers', '1')
    render(<StudySession set={set} cards={cards} />)

    fireEvent.click(await screen.findByRole('button', { name: "I don't know" }))
    expect(screen.getByText('No answer')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Need review (suggested)' })).toBeTruthy()
  })
})
