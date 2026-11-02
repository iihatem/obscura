'use client'

import { useCallback, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '@/lib/trial'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  execute: (id: string) => void
  reset: (id: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile failed to load')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/**
 * Cloudflare Turnstile, loaded only when a visitor actually tries an upload.
 * Most people never see a challenge; when one is needed it appears in `host`.
 */
export function useTurnstile() {
  const host = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const pending = useRef<{ resolve: (t: string) => void; reject: (e: Error) => void } | null>(null)

  const getToken = useCallback(async (): Promise<string> => {
    if (!TURNSTILE_SITE_KEY) throw new Error('Turnstile is not configured')
    await loadScript()
    const api = window.turnstile!
    return new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject }
      if (widget.current === null) {
        widget.current = api.render(host.current!, {
          sitekey: TURNSTILE_SITE_KEY,
          execution: 'execute',
          appearance: 'interaction-only',
          callback: (token: string) => pending.current?.resolve(token),
          'error-callback': () => pending.current?.reject(new Error("We couldn't confirm you're a person. Refresh and try again.")),
        })
      } else {
        api.reset(widget.current)
      }
      api.execute(widget.current)
    })
  }, [])

  return { host, getToken }
}
