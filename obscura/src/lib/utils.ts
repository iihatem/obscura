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
 * Rewrites a Supabase Storage URL to our image proxy endpoint.
 * The proxy uses the service role key, so it works regardless of bucket visibility.
 */
export function proxyImageUrl(storageUrl: string): string {
  const match = storageUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/card-images\/(.+)/)
  if (!match) return storageUrl
  return `/api/image?path=${encodeURIComponent(match[1])}`
}
