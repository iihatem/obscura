import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { Card, FlashCard, Set } from '@/types'
import PracticeTest from './PracticeTest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(() => Promise.reject(new Error('offline'))),
  withColdStartRetry: (fn: () => Promise<unknown>) => fn(),
}))

const set = { id: 's1', title: 'Cells', owner_id: 'u', visibility: 'private' } as Set
const flash = (id: string, front: string, back: string, page: number | null = null): FlashCard => ({
  id, set_id: 's1', position: 0, created_at: '', type: 'flashcard', front, back, image_url: null, labels: null, source_page: page,
})

const LONG = 'It releases energy from glucose through cellular respiration in the cell'
const cards: Card[] = [
  flash('a', 'Powerhouse of the cell?', 'Mitochondria', 3),
  flash('b', 'Where proteins are made?', 'Ribosome', 3),
  flash('c', 'Holds the DNA?', 'Nucleus', 4),
  flash('d', 'Breaks down waste?', 'Lysosome', 9),
  flash('e', 'What does respiration do?', LONG, 9),
]
const answers: Record<string, string> = {
  'Powerhouse of the cell?': 'mitochondria',
  'Where proteins are made?': 'ribosome',
  'Holds the DNA?': 'golgi', // wrong on purpose
  'Breaks down waste?': 'lysosme', // a typo, still right
  'What does respiration do?': 'makes energy from glucose',
}

/** The question on screen, from the card at the top. */
function currentQuestion(): string {
  return Object.keys(answers).find((q) => screen.queryByText(q))!
}

describe('PracticeTest', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as unknown as MediaQueryList)
  })
  afterEach(() => vi.useRealTimers())

  it('starts with typed questions on and multiple choice off', () => {
    render(<PracticeTest set={set} cards={cards} />)
    expect(screen.getByRole('checkbox', { name: /Typed/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('checkbox', { name: /Multiple choice/ }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('checkbox', { name: /Diagram labels/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('radio', { name: 'Off' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: /Start · 5 questions/ })).toBeTruthy()
  })

  it('runs a short test with no marking until the end, then shows the breakdown', () => {
    render(<PracticeTest set={set} cards={cards} />)
    fireEvent.click(screen.getByRole('button', { name: /Start/ }))

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(/\/ 5/).parentElement?.textContent).toBe(`${i + 1} / 5`)
      const q = currentQuestion()
      const box = screen.getByRole('textbox', { name: 'Your answer' })
      fireEvent.change(box, { target: { value: answers[q] } })
      fireEvent.submit(box.closest('form')!)
      // Nothing says whether that was right.
      if (i < 4) expect(screen.queryByText(/Right|Missed|Almost|Looks right|Close/)).toBeNull()
    }

    // The long answer is marked by the student before the score.
    expect(screen.getByText('Mark your long answers')).toBeTruthy()
    expect(screen.getByRole('button', { name: '1 left to mark' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Right' }))
    fireEvent.click(screen.getByRole('button', { name: /See your score/ }))

    // 4 of 5 right.
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText('4 of 5 right')).toBeTruthy()

    // Split by lecture page.
    expect(screen.getByText('By page')).toBeTruthy()
    expect(screen.getByText('p. 3–4')).toBeTruthy()

    // The miss, with what was typed beside the answer.
    const missed = screen.getByText('Holds the DNA?').closest('li')!
    expect(within(missed).getByText('golgi')).toBeTruthy()
    expect(within(missed).getByText('Nucleus')).toBeTruthy()
    expect(within(missed).getByText('Missed')).toBeTruthy()

    // Studying the misses starts a session with just that card.
    fireEvent.click(screen.getByRole('button', { name: 'Study the 1 you missed' }))
    expect(screen.getAllByText('Holds the DNA?').length).toBeGreaterThan(0)
    expect(screen.getByText(/\/ 1/)).toBeTruthy()
  })

  it('shows the right answer for every multiple choice question afterwards', () => {
    const shortCards = cards.slice(0, 4)
    render(<PracticeTest set={set} cards={shortCards} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Typed/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Multiple choice/ }))
    fireEvent.click(screen.getByRole('button', { name: /Start · 4 questions/ }))

    for (let i = 0; i < 4; i++) {
      const options = screen.getAllByRole('radio')
      expect(options).toHaveLength(4)
      // Always pick the first option, right or not.
      fireEvent.click(options[0])
      fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    }

    // Every question appears with its right answer, missed or not.
    for (const c of shortCards as FlashCard[]) {
      const item = screen.getByText(c.front).closest('li')!
      expect(within(item).getByText(c.back)).toBeTruthy()
    }
  })

  it('hands the test in when the timer runs out', () => {
    vi.useFakeTimers()
    render(<PracticeTest set={set} cards={cards.slice(0, 4)} />)
    fireEvent.click(screen.getByRole('radio', { name: '5 min' }))
    fireEvent.click(screen.getByRole('button', { name: /Start/ }))
    expect(screen.getByRole('timer').textContent).toContain('5:00')

    const box = screen.getByRole('textbox', { name: 'Your answer' })
    fireEvent.change(box, { target: { value: answers[currentQuestion()] } })
    fireEvent.submit(box.closest('form')!)

    act(() => { vi.advanceTimersByTime(5 * 60_000 + 1000) })
    expect(screen.getByText(/Time ran out/)).toBeTruthy()
    expect(screen.getByText('1 of 4 right')).toBeTruthy()
    expect(screen.getAllByText('No answer').length).toBeGreaterThan(0)
  })
})

describe('PracticeTest keyboard', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as unknown as MediaQueryList)
  })

  it('does not skip a question when Enter is pressed on an empty box', () => {
    render(<PracticeTest set={set} cards={cards.slice(0, 4)} />)
    fireEvent.click(screen.getByRole('button', { name: /Start/ }))
    const box = screen.getByRole('textbox', { name: 'Your answer' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.getByText(/\/ 4/).parentElement?.textContent).toBe('1 / 4')
    fireEvent.click(screen.getByRole('button', { name: /Skip/ }))
    expect(screen.getByText(/\/ 4/).parentElement?.textContent).toBe('2 / 4')
  })
})
