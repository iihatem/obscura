import { createClient } from '@/lib/supabase/client'
import { getApiKeyHeaders } from '@/lib/apiKey'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Endpoints that spend model credits. Only these get the user's own keys —
// there's no reason to hand them to the CRUD routes.
const GENERATION_PATHS = ['/generate/']

/** The backend is asleep or unreachable — worth retrying, unlike a 4xx. */
export class ApiUnavailableError extends Error {
  constructor() {
    super('The study server is waking up. This takes a few seconds on first use.')
    this.name = 'ApiUnavailableError'
  }
}

/** Waits before each retry while the Space cold-starts, in ms. */
export const COLD_START_BACKOFF = [2_000, 5_000, 10_000, 15_000]

/**
 * Run `fn`, retrying while the API is asleep. A holding page means the request
 * never reached our API — nothing was spent — so waiting it out is safe.
 * `onWaiting` fires before each retry, so callers can say what's happening.
 */
export async function withColdStartRetry<T>(fn: () => Promise<T>, onWaiting?: () => void): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!(err instanceof ApiUnavailableError) || attempt >= COLD_START_BACKOFF.length) throw err
      onWaiting?.()
      await new Promise((r) => setTimeout(r, COLD_START_BACKOFF[attempt]))
    }
  }
}

/**
 * The message from a failed response. FastAPI reports errors as `detail`, our
 * Next routes as `error`; either beats a generic fallback the user can't act on.
 */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  // FastAPI validation errors (422) arrive as a list of {loc, msg} objects.
  if (Array.isArray(body.detail)) {
    const first = body.detail[0]
    const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null
    return first?.msg ? `${field ? `${field}: ` : ''}${first.msg}` : fallback
  }
  return body.detail ?? body.error ?? fallback
}

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()

  const isFormData = options.body instanceof FormData

  const userKeyHeaders = GENERATION_PATHS.some((p) => path.startsWith(p))
    ? getApiKeyHeaders()
    : {}

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...userKeyHeaders,
    ...(options.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  // HF Spaces answers with an HTML holding page while the Space wakes, and it
  // does so with a 200 — so status alone can't be trusted here. Any HTML body
  // means the API itself never ran; surface that instead of letting a caller
  // crash on `.json()`. A 204 (our DELETEs) has no content-type and is fine.
  const contentType = res.headers.get('content-type') ?? ''
  const isHtml = contentType.includes('text/html')
  if (isHtml || (!contentType.includes('application/json') && !res.ok)) {
    throw new ApiUnavailableError()
  }

  return res
}
