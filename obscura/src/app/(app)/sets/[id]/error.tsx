'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'

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
      <Icon name="folder_off" size={48} className="text-bad" />
      <h2 className="font-headline text-xl font-bold text-ink">
        Couldn&apos;t load this set
      </h2>
      <p className="text-sm text-ink-muted max-w-sm">{error.message || 'Something went wrong.'}</p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-on-ink rounded-lg font-bold text-sm hover:opacity-90 transition-all"
        >
          Try again
        </button>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-line bg-surface text-ink rounded-lg font-bold text-sm hover:bg-paper transition-all"
        >
          Back to library
        </Link>
      </div>
    </div>
  )
}
