import { apiFetch, errorMessage, withColdStartRetry } from './api'
import { clearDraft, loadDraft, saveDraftPages, saveDraftState } from './drafts'

/**
 * Trying Obscura from the landing page, before having an account. The cards
 * live in this browser (the drafts store, under one fixed key) until the
 * visitor signs up and /claim saves them into a new set.
 */

export const TRIAL_KEY = 'trial'
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export interface TrialPage {
  dataUrl: string
  pageIndex: number
  extractedText?: string
  type: 'flashcard' | 'diagram'
}

export interface TrialLabel { label: string; x: number; y: number; width: number; height: number }

export interface TrialResult {
  pageIndex: number
  type: 'flashcard' | 'diagram'
  cards?: { front: string; back: string }[]
  labels?: TrialLabel[]
  /** The cropped diagram, when the server found one on the page. */
  imageDataUrl?: string
}

export interface TrialDraft {
  fileName: string
  results: TrialResult[]
}

export class TrialError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function call<T>(path: string, init: RequestInit, onWaking?: () => void): Promise<T> {
  const res = await withColdStartRetry(() => apiFetch(path, init), onWaking)
  if (!res.ok) throw new TrialError(await errorMessage(res, 'Something went wrong. Please try again.'), res.status)
  return res.json()
}

export async function trialStatus(): Promise<{ enabled: boolean; limit: number }> {
  try {
    return await call('/try/status', { method: 'GET' })
  } catch {
    return { enabled: false, limit: 0 }
  }
}

export function startTrial(turnstileToken: string, onWaking?: () => void) {
  return call<{ pass: string; pagesLeft: number; limit: number }>('/try/start', {
    method: 'POST',
    body: JSON.stringify({ turnstileToken }),
  }, onWaking)
}

export function trialPdfPages(file: File, pass: string, onWaking?: () => void) {
  const form = new FormData()
  form.append('file', file)
  return call<{ pages: { dataUrl: string; pageIndex: number; extractedText?: string }[] }>('/try/pdf', {
    method: 'POST',
    body: form,
    headers: { 'X-Trial-Pass': pass },
  }, onWaking)
}

export async function trialGenerate(page: TrialPage, pass: string, onWaking?: () => void): Promise<TrialResult> {
  const imageBase64 = page.dataUrl.slice(page.dataUrl.indexOf(',') + 1)
  if (page.type === 'diagram') {
    const r = await call<{ labels: TrialLabel[]; croppedImageBase64?: string }>('/try/labels', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, setId: 'trial' }),
      headers: { 'X-Trial-Pass': pass },
    }, onWaking)
    return {
      pageIndex: page.pageIndex,
      type: 'diagram',
      labels: r.labels ?? [],
      imageDataUrl: r.croppedImageBase64 ? `data:image/jpeg;base64,${r.croppedImageBase64}` : page.dataUrl,
    }
  }
  const r = await call<{ cards: { front: string; back: string }[] }>('/try/flashcards', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, setId: 'trial', extractedText: page.extractedText }),
    headers: { 'X-Trial-Pass': pass },
  }, onWaking)
  return { pageIndex: page.pageIndex, type: 'flashcard', cards: r.cards ?? [] }
}

/** Kept until the visitor has an account to save into. */
export async function keepTrialDraft(draft: TrialDraft) {
  await saveDraftPages(TRIAL_KEY, { fileName: draft.fileName })
  await saveDraftState(TRIAL_KEY, draft)
}

export async function loadTrialDraft(): Promise<TrialDraft | null> {
  const d = await loadDraft<unknown, TrialDraft>(TRIAL_KEY)
  return d?.state ?? null
}

export function clearTrialDraft() {
  return clearDraft(TRIAL_KEY)
}

export function cardCount(results: TrialResult[]): number {
  return results.reduce((n, r) => n + (r.type === 'diagram' ? 1 : r.cards?.length ?? 0), 0)
}
