import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Card, Set } from '@/types'
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
