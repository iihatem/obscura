'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { KeyRound, X } from 'lucide-react'
import { hasAnyApiKey } from '@/lib/apiKey'

const DISMISSED = 'obscura:api-key-notice-dismissed'

/**
 * Tells users without a key of their own that generation runs on a shared
 * daily allowance, and that their own key lifts it. Hidden once a key is saved
 * or the note is dismissed.
 */
export default function ApiKeyNotice() {
  // Rendered only after mount: localStorage doesn't exist on the server, and
  // guessing wrong would flash the note at users who already have a key.
  const [show, setShow] = useState(false)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISSED) === '1' } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only storage after mount
    setShow(!dismissed && !hasAnyApiKey())
  }, [])

  if (!show) return null

  function dismiss() {
    try { localStorage.setItem(DISMISSED, '1') } catch {}
    setShow(false)
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-paper-2 px-4 py-3">
      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      <p className="flex-1 text-sm text-ink-muted">
        Every account gets a daily allowance of pages to turn into cards.{' '}
        <Link href="/profile" className="font-semibold text-accent-ink underline-offset-2 hover:underline">Add your own API key</Link>{' '}
        to go past it.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper hover:text-ink">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
