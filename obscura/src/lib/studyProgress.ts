import type { Grade } from './scoring'

/**
 * A session in progress, kept in this browser so an accidental back swipe
 * or reload doesn't throw away the answers so far. Cleared when the session
 * finishes or the student starts over.
 */
export interface SavedProgress {
  mode: 'flashcard' | 'diagram' | 'mixed'
  deck: string[]
  answers: { cardId: string; grade: Grade; time_taken_ms: number; labelGrades?: Grade[] }[]
  savedAt: number
}

const key = (setId: string) => `obscura:study:${setId}`
/** Older than this, a session is stale and not worth offering back. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

export function saveProgress(setId: string, p: SavedProgress) {
  try { localStorage.setItem(key(setId), JSON.stringify(p)) } catch {}
}

export function clearProgress(setId: string) {
  try { localStorage.removeItem(key(setId)) } catch {}
}

/** The saved session, if it's recent, unfinished, and every card in it still exists. */
export function loadProgress(setId: string, cardIds: ReadonlySet<string>, now = Date.now()): SavedProgress | null {
  let p: SavedProgress
  try {
    const raw = localStorage.getItem(key(setId))
    if (!raw) return null
    p = JSON.parse(raw)
  } catch {
    return null
  }
  const valid =
    Array.isArray(p?.deck) && Array.isArray(p?.answers) &&
    p.answers.length > 0 && p.answers.length < p.deck.length &&
    now - (p.savedAt ?? 0) < MAX_AGE_MS &&
    p.deck.every((id) => cardIds.has(id))
  if (!valid) {
    clearProgress(setId)
    return null
  }
  return p
}

/** Signing out on a shared computer shouldn't leave sessions behind. */
export function clearAllProgress() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('obscura:study:')).forEach((k) => localStorage.removeItem(k))
  } catch {}
}
