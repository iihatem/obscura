import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import type { ExamPlan } from '@/lib/examPlans'
import type { GradeEvent } from '@/lib/reviewPlan'
import type { Card, Set } from '@/types'
import ExamPlanPanel from './ExamPlanPanel'
import ExamPlanDialog from './ExamPlanDialog'
import TodayPanel, { type TodayItem } from './TodayPanel'
import TodayStudy from './TodayStudy'

const api = vi.hoisted(() => ({ saveExamPlan: vi.fn(), clearExamPlan: vi.fn() }))
vi.mock('@/lib/examPlansApi', () => api)
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(() => Promise.reject(new Error('offline'))),
  withColdStartRetry: (fn: () => Promise<unknown>) => fn(),
}))

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

// Sunday, Nov 8, 2026, mid-afternoon on this machine.
const TODAY = '2026-11-08'
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 8, 15, 0))
  api.saveExamPlan.mockReset()
  api.clearExamPlan.mockReset()
  localStorage.clear()
})
afterEach(() => vi.useRealTimers())

const ids = (n: number, prefix = 'c') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`)
const plan = (over: Partial<ExamPlan> = {}): ExamPlan => ({ set_id: 's1', exam_date: '2026-11-17', daily_cap: 30, created_at: new Date(2026, 10, 8, 9).toISOString(), ...over })
/** Graded at noon local time, `daysAgo` days back. */
const graded = (cardId: string, grade: GradeEvent['grade'], daysAgo: number): GradeEvent => ({ cardId, grade, at: new Date(2026, 10, 8 - daysAgo, 12).toISOString() })

function renderPanel(props: Partial<React.ComponentProps<typeof ExamPlanPanel>> = {}) {
  return render(
    <ToastProvider>
      <ExamPlanPanel setId="s1" cardIds={ids(40)} history={[]} plan={null} {...props} />
    </ToastProvider>
  )
}

describe('ExamPlanPanel', () => {
  it('offers to plan for an exam when there is no plan', () => {
    renderPanel()
    expect(screen.getByText('Have an exam coming up?')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Plan for an exam/ })).toBeTruthy()
  })

  it('stays out of the way on a set with no cards', () => {
    const { container } = renderPanel({ cardIds: [] })
    expect(container.textContent).toBe('')
  })

  it('sets a plan with the picked date and limit', async () => {
    api.saveExamPlan.mockImplementation(async (setId: string, exam_date: string, daily_cap: number) => ({ set_id: setId, exam_date, daily_cap, created_at: new Date().toISOString() }))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Plan for an exam/ }))

    const dialog = screen.getByRole('dialog', { hidden: true })
    const date = within(dialog).getByLabelText('Exam date') as HTMLInputElement
    expect(date.value).toBe('2026-11-15')
    expect(date.min).toBe(TODAY)
    fireEvent.change(date, { target: { value: '2026-11-17' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: '50', hidden: true }))
    // A preview of what that means today.
    expect(within(dialog).getByText('Today: 10 cards')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Set plan', hidden: true }))

    await waitFor(() => expect(api.saveExamPlan).toHaveBeenCalledWith('s1', '2026-11-17', 50, false))
    expect(await screen.findByText('Today: 10 cards', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText(/Exam in 9 days, Tue, Nov 17/)).toBeTruthy()
  })

  it("won't set an exam date in the past", () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Plan for an exam/ }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    fireEvent.change(within(dialog).getByLabelText('Exam date'), { target: { value: '2026-11-01' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Set plan', hidden: true }))
    expect(within(dialog).getByText('Pick today or a day after it.')).toBeTruthy()
    expect(api.saveExamPlan).not.toHaveBeenCalled()
  })

  it("warns when the limit is too low to see every card before the exam", () => {
    renderPanel({ cardIds: ids(200) })
    fireEvent.click(screen.getByRole('button', { name: /Plan for an exam/ }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    fireEvent.change(within(dialog).getByLabelText('Exam date'), { target: { value: '2026-11-10' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: '15', hidden: true }))
    expect(within(dialog).getByText(/At 15 a day, \d+ cards won't come up before the exam/)).toBeTruthy()
  })

  it("shows today's count and studies just those cards", () => {
    renderPanel({ plan: plan() })
    expect(screen.getByText('Today: 10 cards')).toBeTruthy()
    expect(screen.getByText(/Exam in 9 days/)).toBeTruthy()
    expect(screen.getByText(/0 of 40 learned/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Study today’s cards/ }).getAttribute('href')).toBe('/sets/s1/study?plan=today')
  })

  it('says done for today, and what is next, once the list is studied', () => {
    const history = ids(10).map((id) => graded(id, 'correct', 0))
    renderPanel({ plan: plan(), history })
    expect(screen.getByText('Done for today')).toBeTruthy()
    expect(screen.getByText('Next: 10 cards tomorrow.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Study today/ })).toBeNull()
  })

  it('shows progress partway through the day', () => {
    const history = ids(4).map((id) => graded(id, 'correct', 0))
    renderPanel({ plan: plan(), history })
    expect(screen.getByText('Today: 6 cards left')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: "Today's cards done" }).getAttribute('aria-valuenow')).toBe('40')
    expect(screen.getByRole('link', { name: /Keep going/ })).toBeTruthy()
  })

  it('changes and removes the plan', async () => {
    api.clearExamPlan.mockResolvedValue(undefined)
    renderPanel({ plan: plan({ daily_cap: 40 }) })
    fireEvent.click(screen.getByRole('button', { name: 'Change the exam plan' }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect((within(dialog).getByLabelText('Exam date') as HTMLInputElement).value).toBe('2026-11-17')
    // A limit outside the presets is still offered.
    expect(within(dialog).getByRole('radio', { name: '40', hidden: true }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove plan', hidden: true }))
    await waitFor(() => expect(api.clearExamPlan).toHaveBeenCalledWith('s1'))
    expect(await screen.findByText('Have an exam coming up?')).toBeTruthy()
  })

  it('offers a new date once the exam has passed', () => {
    renderPanel({ plan: plan({ exam_date: '2026-11-03' }) })
    expect(screen.getByText('Your exam was Nov 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Set a new date' }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect((within(dialog).getByLabelText('Exam date') as HTMLInputElement).value).toBe('2026-11-15')
  })
})

describe('ExamPlanDialog', () => {
  it('says so when saving fails', async () => {
    const save = vi.fn().mockRejectedValue({ code: 'PGRST205' })
    render(
      <ToastProvider>
        <ExamPlanDialog open onClose={vi.fn()} setId="s1" cardIds={ids(5)} history={[]} plan={null} today={TODAY} onSaved={vi.fn()} save={save} />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Set plan', hidden: true }))
    expect((await screen.findByRole('alert', { hidden: true })).textContent).toBe("Exam plans aren't switched on yet.")
  })
})

describe('TodayPanel', () => {
  const item = (id: string, title: string, over: Partial<ExamPlan> = {}, history: GradeEvent[] = [], n = 40): TodayItem => ({
    set: { id, title, subject: 'BIO 110' },
    plan: plan({ set_id: id, ...over }),
    cardIds: ids(n, `${id}-`),
    history,
  })

  it('lists each planned set with its cards for today and the exam', () => {
    render(<TodayPanel items={[item('a', 'Cell biology')]} />)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy()
    expect(screen.getByText('BIO 110 · 10 cards today · Exam in 9 days')).toBeTruthy()
    expect(screen.getByText('10 cards to review')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Study Cell biology' }).getAttribute('href')).toBe('/sets/a/study?plan=today')
  })

  it('puts sets with cards left first, soonest exam first, and past exams last', () => {
    const doneHistory = ids(10, 'b-').map((id) => graded(id, 'correct', 0))
    render(
      <TodayPanel items={[
        item('p', 'Past', { exam_date: '2026-11-01' }),
        item('b', 'Done', {}, doneHistory),
        item('l', 'Later', { exam_date: '2026-11-28' }),
        item('s', 'Sooner', { exam_date: '2026-11-12' }),
      ]} />
    )
    const titles = screen.getAllByRole('listitem').map((li) => li.querySelector('a')!.textContent)
    expect(titles).toEqual(['Sooner', 'Later', 'Done', 'Past'])
    expect(screen.getByText('BIO 110 · Done for today · 10 tomorrow · Exam in 9 days')).toBeTruthy()
    expect(screen.getByText('BIO 110 · Exam was Nov 1')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Update plan' }).getAttribute('href')).toBe('/sets/p')
  })

  it('says all done when nothing is left', () => {
    const doneHistory = ids(10, 'b-').map((id) => graded(id, 'correct', 0))
    render(<TodayPanel items={[item('b', 'Physiology', {}, doneHistory)]} />)
    expect(screen.getByText('All done')).toBeTruthy()
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Study/ })).toBeNull()
  })

  it('renders nothing without plans', () => {
    const { container } = render(<TodayPanel items={[]} />)
    expect(container.textContent).toBe('')
  })
})

describe('TodayStudy', () => {
  const set = { id: 's1', title: 'Cells', owner_id: 'u', visibility: 'private' } as Set
  const card = (id: string, i: number): Card => ({ id, set_id: 's1', position: i, created_at: '', type: 'flashcard', front: `Q ${id}`, back: `A ${id}`, image_url: null, labels: null })
  const cards = ids(3).map(card)

  it("studies only today's cards, then says done for today", async () => {
    // c1 was missed yesterday; c2 and c3 were recalled yesterday, so they wait.
    const history = [graded('c1', 'wrong', 1), graded('c2', 'correct', 1), graded('c3', 'correct', 1)]
    render(<TodayStudy set={set} cards={cards} plan={plan()} history={history} />)

    expect(await screen.findByText(/\/ 1/)).toBeTruthy()
    expect(screen.getAllByText('Q c1').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /^Show answer/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confident/ }))

    expect(await screen.findByText('Done for today')).toBeTruthy()
    expect(screen.getByText('Next: 2 cards tomorrow.')).toBeTruthy()
  })

  it('keeps unfinished progress apart from free study', async () => {
    const history = [graded('c1', 'wrong', 1), graded('c2', 'wrong', 1), graded('c3', 'correct', 1)]
    render(<TodayStudy set={set} cards={cards} plan={plan()} history={history} />)
    fireEvent.click(await screen.findByRole('button', { name: /^Show answer/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confident/ }))
    expect(localStorage.getItem('obscura:study:s1')).toBeNull()
    expect(JSON.parse(localStorage.getItem('obscura:study:s1:today')!).deck).toHaveLength(2)
  })

  it('says done for today when the list is already studied', () => {
    const history = [graded('c1', 'correct', 0), graded('c2', 'correct', 0), graded('c3', 'correct', 0)]
    render(<TodayStudy set={set} cards={cards} plan={plan()} history={history} />)
    expect(screen.getByText('Done for today')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Study the whole set/ }).getAttribute('href')).toBe('/sets/s1/study')
  })
})
