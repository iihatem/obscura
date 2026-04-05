'use client'

import { useEffect } from 'react'

export default function LibraryError({
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
      <span className="material-symbols-outlined text-[48px] text-[#ba1a1a]">error</span>
      <h2 className="text-xl font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
        Couldn&apos;t load your library
      </h2>
      <p className="text-sm text-[#45474d] max-w-sm">{error.message || 'Something went wrong.'}</p>
      <button
        onClick={reset}
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 scholar-gradient text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all"
      >
        Try again
      </button>
    </div>
  )
}
