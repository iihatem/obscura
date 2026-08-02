/**
 * Optional user-supplied Anthropic API key ("bring your own key").
 *
 * The key is deliberately kept in localStorage and never sent to our database —
 * it travels straight from the browser to our API as a request header, is used
 * to build one Anthropic client, and is dropped. We are not custodians of it.
 *
 * Trade-off: because it lives in localStorage it is readable by any script
 * running on this origin, so an XSS bug on the app would expose it. That's a
 * smaller blast radius than storing every user's key in one database table.
 */

const STORAGE_KEY = 'obscura.anthropicApiKey'

export const API_KEY_PREFIX = 'sk-ant-'

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private browsing / storage disabled
    return null
  }
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, key.trim())
  } catch {
    /* ignore */
  }
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function isValidApiKeyFormat(key: string): boolean {
  return key.trim().startsWith(API_KEY_PREFIX)
}

/** Show only enough to recognise which key is saved. */
export function maskApiKey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 12) return '••••'
  return `${trimmed.slice(0, 11)}…${trimmed.slice(-4)}`
}
