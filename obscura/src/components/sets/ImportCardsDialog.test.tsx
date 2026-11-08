import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import ImportCardsDialog from './ImportCardsDialog'
import { apiFetch } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  errorMessage: async (_res: Response, fallback: string) => fallback,
  withColdStartRetry: (fn: () => Promise<unknown>) => fn(),
  ApiUnavailableError: class extends Error {},
}))

const ok = () => new Response('[]', { status: 201, headers: { 'content-type': 'application/json' } })

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

function setup() {
  const onImported = vi.fn()
  render(
    <ToastProvider>
      <ImportCardsDialog open onClose={() => {}} setId="set-1" onImported={onImported} />
    </ToastProvider>
  )
  const paste = (text: string) => fireEvent.change(screen.getByLabelText('Cards'), { target: { value: text } })
  return { onImported, paste }
}

describe('ImportCardsDialog', () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset())

  it('previews pasted Quizlet cards and saves them in one request', async () => {
    vi.mocked(apiFetch).mockResolvedValue(ok())
    const { onImported, paste } = setup()
    paste('mitosis\tcell division\nATP\tenergy store')

    expect(await screen.findByText('2 cards ready')).toBeTruthy()
    expect(screen.getByText('mitosis')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Import 2 cards' }))

    await waitFor(() => expect(onImported).toHaveBeenCalledWith(2))
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toBe('/cards/bulk')
    expect(JSON.parse(init!.body as string)).toEqual({
      set_id: 'set-1',
      cards: [
        { type: 'flashcard', front: 'mitosis', back: 'cell division' },
        { type: 'flashcard', front: 'ATP', back: 'energy store' },
      ],
    })
  })

  it('holds back flagged cards until they are fixed or skipped', async () => {
    const { paste } = setup()
    paste('a\tb\nlonely\nc\td\nalone too')

    expect(await screen.findByText('2 cards ready')).toBeTruthy()
    const importButton = () => screen.getByRole('button', { name: /^Import/ }) as HTMLButtonElement
    expect(importButton().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Answer for card 2'), { target: { value: 'fixed answer' } })
    expect(await screen.findByText('3 cards ready')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Skip' })[1])
    expect(importButton().disabled).toBe(false)
    expect(importButton().textContent).toBe('Import 3 cards')
  })

  it('lets the student change the separator', async () => {
    const { paste } = setup()
    paste('a|b\nc|d')
    expect(await screen.findByText(/missing a side/)).toBeTruthy()

    const group = screen.getByRole('radiogroup', { name: 'Between question and answer' })
    fireEvent.click(within(group).getByRole('radio', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('Custom separator between question and answer'), { target: { value: '|' } })
    expect(await screen.findByText('2 cards ready')).toBeTruthy()
  })

  it('sends big imports in batches of 500', async () => {
    vi.mocked(apiFetch).mockImplementation(async () => ok())
    const { onImported, paste } = setup()
    paste(Array.from({ length: 1100 }, (_, i) => `q${i}\ta${i}`).join('\n'))

    fireEvent.click(await screen.findByRole('button', { name: 'Import 1100 cards' }))
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(1100))
    const sizes = vi.mocked(apiFetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string).cards.length)
    expect(sizes).toEqual([500, 500, 100])
  })

  it('carries on from the failed batch when retried', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValue(ok())
    const { onImported, paste } = setup()
    paste(Array.from({ length: 600 }, (_, i) => `q${i}\ta${i}`).join('\n'))

    fireEvent.click(await screen.findByRole('button', { name: 'Import 600 cards' }))
    expect(await screen.findByText(/500 cards of 600 imported/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Import the rest' }))
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(600))
    const last = JSON.parse(vi.mocked(apiFetch).mock.calls[2][1]!.body as string).cards
    expect(last).toHaveLength(100)
    expect(last[0].front).toBe('q500')
  })

  it('explains that .apkg files need exporting as plain text', async () => {
    setup()
    fireEvent.click(screen.getByRole('radio', { name: 'Upload a file' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['PK'], 'Biology.apkg')] } })
    expect((await screen.findByRole('alert')).textContent).toMatch(/Notes in Plain Text/)
  })
})
