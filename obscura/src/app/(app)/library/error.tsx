'use client'

import { useEffect } from 'react'
import Icon from '@/components/ui/Icon'

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
      <Icon name="error" size={48} className="text-bad" />
      <h2 className="font-headline text-xl font-bold text-ink">
        Couldn&apos;t load your library
      </h2>
      <p className="text-sm text-ink-muted max-w-sm">{error.message || 'Something went wrong.'}</p>
      <button
        onClick={reset}
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-on-ink rounded-lg font-bold text-sm hover:opacity-90 transition-all"
      >
        Try again
      </button>
    </div>
  )
}
