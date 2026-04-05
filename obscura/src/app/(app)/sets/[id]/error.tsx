'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function SetDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center px-6">
      <span className="material-symbols-outlined text-[48px] text-[#ba1a1a]">folder_off</span>
      <h2 className="text-xl font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
        Couldn&apos;t load this set
      </h2>
      <p className="text-sm text-[#45474d] max-w-sm">{error.message || 'Something went wrong.'}</p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 scholar-gradient text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all"
        >
          Try again
        </button>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#e7e8e9] bg-white text-[#051125] rounded-lg font-bold text-sm hover:bg-[#f3f4f5] transition-all"
        >
          Back to library
        </Link>
      </div>
    </div>
  )
}
