import { createClient } from '@/lib/supabase/client'
import { getApiKey } from '@/lib/apiKey'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Endpoints that spend Anthropic credits. Only these get the user's own key —
// there's no reason to hand it to the CRUD routes.
const GENERATION_PATHS = ['/generate/']

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()

  const isFormData = options.body instanceof FormData

  const userApiKey = GENERATION_PATHS.some((p) => path.startsWith(p))
    ? getApiKey()
    : null

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(userApiKey ? { 'X-Anthropic-Key': userApiKey } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  // HF Spaces returns HTML when the space is sleeping/starting up.
  // Detect this and throw a clear error rather than a JSON parse crash.
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json') && !res.ok) {
    throw new Error('The API server is starting up. Please wait a moment and try again.')
  }

  return res
}
