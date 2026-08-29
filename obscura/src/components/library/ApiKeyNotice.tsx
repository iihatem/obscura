'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PROVIDERS, PROVIDER_ORDER, hasAnyApiKey } from '@/lib/apiKey'

/**
 * Heads-up that AI generation runs on a shared key that can be capped or out of
 * credit. Only shown to users without a key of their own — once one is saved for
 * either provider the warning no longer applies, so it disappears on its own.
 */
export default function ApiKeyNotice() {
  // Rendered only after mount: localStorage doesn't exist on the server, and
  // guessing wrong would flash a warning at users who already have a key.
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!hasAnyApiKey())
  }, [])

  if (!show) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#f0d9a8] bg-[#fdf8ef] px-4 py-3">
      <span className="material-symbols-outlined text-[20px] text-[#b45309] shrink-0">
        warning
      </span>
      <p className="text-sm text-[#45474d] flex-1 min-w-[16rem]">
        AI generation may not work right now — the shared key can hit its daily cap or run out
        of credit. Add your own Anthropic or OpenAI key to generate without limits.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {PROVIDER_ORDER.map((provider) => (
          <a
            key={provider}
            href={PROVIDERS[provider].links.billing}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#b45309] px-3 text-xs font-bold text-white hover:bg-[#92400e] transition-colors"
          >
            Buy {PROVIDERS[provider].label} key
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        ))}
        <Link
          href="/profile"
          className="inline-flex h-8 items-center rounded-lg border border-[#e7d3ab] bg-white px-3 text-xs font-bold text-[#92400e] hover:bg-[#fefaf3] transition-colors"
        >
          Add it here
        </Link>
      </div>
    </div>
  )
}
