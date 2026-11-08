/**
 * Copying one set's cards into another. Pure helpers, so the rules the API
 * enforces are tested here rather than discovered by a failed save.
 */
import type { Label } from '@/types'
import { BULK_LIMIT, chunk } from './importCards'

/** The columns of a card that a copy needs. */
export interface SourceCard {
  type: 'flashcard' | 'diagram'
  position: number
  front: string | null
  back: string | null
  image_url: string | null
  labels: Label[] | null
  source_page?: number | null
}

export type BulkCard =
  | { type: 'flashcard'; front: string; back: string; source_page?: number }
  | { type: 'diagram'; image_url: string; labels: Label[]; source_page?: number }

/**
 * Whether the API will accept `url` as one of this user's own images: a file
 * in the `card-images` bucket, in the folder named after them. Mirrors the
 * backend's `is_own_image_url`.
 */
export function isOwnImageUrl(url: string, userId: string, supabaseUrl: string): boolean {
  const base = supabaseUrl.replace(/\/+$/, '')
  for (const kind of ['public', 'sign']) {
    const prefix = `${base}/storage/v1/object/${kind}/card-images/`
    if (!url.startsWith(prefix)) continue
    const segments = url.slice(prefix.length).split('?')[0].split('/')
    return segments.length >= 2 && segments[0] === userId
      && segments.every((s) => /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,127}$/.test(s) && s.replace(/\./g, '') !== '')
  }
  return false
}

export interface MergePlan {
  /** Batches for `/cards/bulk`, flashcards first, each kind in its set order. */
  chunks: BulkCard[][]
  total: number
  /**
   * Diagrams whose image belongs to someone else — kept from a set copied from
   * a classmate. The API only takes your own uploads, so these stay behind.
   */
  skipped: number
}

export function planMerge(cards: SourceCard[], userId: string, supabaseUrl: string, size = BULK_LIMIT): MergePlan {
  const order = { flashcard: 0, diagram: 1 }
  const sorted = [...cards].sort((a, b) => order[a.type] - order[b.type] || a.position - b.position)

  const out: BulkCard[] = []
  let skipped = 0
  for (const card of sorted) {
    const source_page = card.source_page ?? undefined
    if (card.type === 'flashcard') {
      // The API rejects a blank side, and one bad card would sink its whole batch.
      if (!card.front?.trim() || !card.back?.trim()) { skipped++; continue }
      out.push({ type: 'flashcard', front: card.front, back: card.back, ...(source_page ? { source_page } : {}) })
    } else {
      if (!card.image_url || !isOwnImageUrl(card.image_url, userId, supabaseUrl)) { skipped++; continue }
      out.push({ type: 'diagram', image_url: card.image_url, labels: card.labels ?? [], ...(source_page ? { source_page } : {}) })
    }
  }
  return { chunks: chunk(out, size), total: out.length, skipped }
}
