/**
 * Optional user-supplied model API keys ("bring your own key").
 *
 * Keys are deliberately kept in localStorage and never sent to our database —
 * they travel straight from the browser to our API as request headers, are used
 * to build one client, and are dropped. We are not custodians of them.
 *
 * Trade-off: because they live in localStorage they are readable by any script
 * running on this origin, so an XSS bug on the app would expose them. That's a
 * smaller blast radius than storing every user's key in one database table.
 */

export type Provider = 'anthropic' | 'openai'

interface ProviderInfo {
  label: string
  /** Every key of this provider starts with this. */
  prefix: string
  /** Prefixes that look right but belong to another provider. */
  notPrefix?: string
  /** Header the key travels in. */
  header: string
  storageKey: string
  links: { keys: string; billing: string; pricing: string; console: string }
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  anthropic: {
    label: 'Anthropic',
    prefix: 'sk-ant-',
    header: 'X-Anthropic-Key',
    storageKey: 'obscura.anthropicApiKey',
    links: {
      keys: 'https://console.anthropic.com/settings/keys',
      billing: 'https://console.anthropic.com/settings/billing',
      pricing: 'https://www.anthropic.com/pricing#api',
      console: 'https://console.anthropic.com/',
    },
  },
  openai: {
    label: 'OpenAI',
    prefix: 'sk-',
    // Anthropic keys start with "sk-" too — don't accept one here.
    notPrefix: 'sk-ant-',
    header: 'X-OpenAI-Key',
    storageKey: 'obscura.openaiApiKey',
    links: {
      keys: 'https://platform.openai.com/api-keys',
      billing: 'https://platform.openai.com/settings/organization/billing/overview',
      pricing: 'https://openai.com/api/pricing/',
      console: 'https://platform.openai.com/',
    },
  },
}

export const PROVIDER_ORDER: Provider[] = ['anthropic', 'openai']

export function getApiKey(provider: Provider): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(PROVIDERS[provider].storageKey)
  } catch {
    // Private browsing / storage disabled
    return null
  }
}

/** Every stored key, as the headers they travel in. */
export function getApiKeyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const provider of PROVIDER_ORDER) {
    const key = getApiKey(provider)
    if (key) headers[PROVIDERS[provider].header] = key
  }
  return headers
}

/** True when the user has supplied at least one key of their own. */
export function hasAnyApiKey(): boolean {
  return PROVIDER_ORDER.some((p) => !!getApiKey(p))
}

export function setApiKey(provider: Provider, key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROVIDERS[provider].storageKey, key.trim())
  } catch {
    /* ignore */
  }
}

export function clearApiKey(provider: Provider): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PROVIDERS[provider].storageKey)
  } catch {
    /* ignore */
  }
}

export function isValidApiKeyFormat(provider: Provider, key: string): boolean {
  const { prefix, notPrefix } = PROVIDERS[provider]
  const trimmed = key.trim()
  if (notPrefix && trimmed.startsWith(notPrefix)) return false
  return trimmed.startsWith(prefix)
}

/** Show only enough to recognise which key is saved. */
export function maskApiKey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 12) return '••••'
  return `${trimmed.slice(0, 11)}…${trimmed.slice(-4)}`
}
