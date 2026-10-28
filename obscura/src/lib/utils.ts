import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function genId(): string {
  return uuidv4()
}

/**
 * A post-login destination taken from the URL, or `fallback` if it isn't a
 * plain same-site path. Anything else — `//host`, `/\host`, `https:`,
 * `javascript:` — would send the user off-site or run script on our origin.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/library'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback
  }
  return value
}

/**
 * Rewrites a Supabase Storage URL to our image proxy endpoint.
 * The proxy uses the service role key, so it works regardless of bucket visibility.
 */
export function proxyImageUrl(storageUrl: string): string {
  const match = storageUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/card-images\/(.+)/)
  if (!match) return storageUrl
  // Strip any query string (e.g. signed URL tokens) — the path alone is enough
  const storagePath = match[1].split('?')[0]
  return `/api/image/${storagePath}`
}
