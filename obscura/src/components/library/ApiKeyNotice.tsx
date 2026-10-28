'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { hasAnyApiKey } from '@/lib/apiKey'

/**
 * Tells users without a key of their own that generation runs on the shared key
 * with a daily allowance, and that adding a key lifts the cap. Once a key is
 * saved for either provider the note no longer applies, so it disappears.
 */
export default function ApiKeyNotice() {
  // Rendered only after mount: localStorage doesn't exist on the server, and
  // guessing wrong would flash the note at users who already have a key.
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!hasAnyApiKey())
  }, [])

  if (!show) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#006972]/20 bg-[#006972]/[0.04] px-4 py-3">
      <span className="material-symbols-outlined text-[20px] text-[#006972] shrink-0" aria-hidden>
        auto_awesome
      </span>
      <p className="text-sm text-[#45474d] flex-1 min-w-[16rem]">
        AI generation is included — every account gets a free daily allowance. Add your own
        Anthropic or OpenAI key any time to generate without limits.
      </p>
      <Link
        href="/profile"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#006972]/25 bg-white px-3 text-xs font-bold text-[#006972] hover:bg-[#006972]/[0.06] transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden>key</span>
        Use my own key
      </Link>
    </div>
  )
}
