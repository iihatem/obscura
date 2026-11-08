import { describe, expect, it } from 'vitest'
import { isOwnImageUrl, planMerge, type SourceCard } from './mergeSets'

const SUPABASE = 'https://proj.supabase.co'
const ME = 'user-1'
const img = (owner: string, file = 'a.png', kind = 'public') => `${SUPABASE}/storage/v1/object/${kind}/card-images/${owner}/${file}`

const flash = (position: number, front = `q${position}`, back = `a${position}`): SourceCard =>
  ({ type: 'flashcard', position, front, back, image_url: null, labels: null })
const diagram = (position: number, url = img(ME, `d${position}.png`)): SourceCard =>
  ({ type: 'diagram', position, front: null, back: null, image_url: url, labels: [{ label: 'Nucleus', x: 1, y: 2, width: 3, height: 4 }], source_page: 3 })

describe('isOwnImageUrl', () => {
  it('accepts the user’s own public and signed uploads', () => {
    expect(isOwnImageUrl(img(ME), ME, SUPABASE)).toBe(true)
    expect(isOwnImageUrl(`${img(ME, 'a.png', 'sign')}?token=abc`, ME, SUPABASE + '/')).toBe(true)
    expect(isOwnImageUrl(img(ME, 'sub/a.png'), ME, SUPABASE)).toBe(true)
  })

  it('rejects someone else’s folder, other hosts and path tricks', () => {
    expect(isOwnImageUrl(img('user-2'), ME, SUPABASE)).toBe(false)
    expect(isOwnImageUrl('https://evil.example/a.png', ME, SUPABASE)).toBe(false)
    expect(isOwnImageUrl(img(ME, '../user-2/a.png'), ME, SUPABASE)).toBe(false)
    expect(isOwnImageUrl(`${SUPABASE}/storage/v1/object/public/card-images/${ME}`, ME, SUPABASE)).toBe(false)
  })
})

describe('planMerge', () => {
  it('copies flashcards then diagrams, each in set order, keeping labels and pages', () => {
    const plan = planMerge([diagram(1), flash(2), diagram(0), flash(0)], ME, SUPABASE)
    expect(plan.total).toBe(4)
    expect(plan.skipped).toBe(0)
    expect(plan.chunks).toHaveLength(1)
    const [cards] = plan.chunks
    expect(cards.map((c) => (c.type === 'flashcard' ? c.front : c.image_url))).toEqual(['q0', 'q2', img(ME, 'd0.png'), img(ME, 'd1.png')])
    expect(cards[2]).toEqual({ type: 'diagram', image_url: img(ME, 'd0.png'), labels: [{ label: 'Nucleus', x: 1, y: 2, width: 3, height: 4 }], source_page: 3 })
    expect(cards[0]).toEqual({ type: 'flashcard', front: 'q0', back: 'a0' })
  })

  it('leaves out diagrams whose image belongs to someone else', () => {
    const plan = planMerge([flash(0), diagram(0, img('classmate')), diagram(1)], ME, SUPABASE)
    expect(plan.total).toBe(2)
    expect(plan.skipped).toBe(1)
  })

  it('leaves out cards the API would reject', () => {
    const plan = planMerge([flash(0, '  ', 'a'), { ...diagram(1), image_url: null }], ME, SUPABASE)
    expect(plan.total).toBe(0)
    expect(plan.skipped).toBe(2)
    expect(plan.chunks).toEqual([])
  })

  it('batches big sets', () => {
    const cards = Array.from({ length: 1203 }, (_, i) => flash(i))
    expect(planMerge(cards, ME, SUPABASE).chunks.map((c) => c.length)).toEqual([500, 500, 203])
  })
})
