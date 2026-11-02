'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { CloudOff, RotateCcw } from 'lucide-react'
import Button, { buttonClass } from './Button'

/**
 * What a route shows when it fails to load. The raw error stays in the console:
 * in production it's a generic server message that would only confuse students.
 */
export default function ErrorState({ error, reset, title, back }: {
  error: Error & { digest?: string }
  reset: () => void
  title: string
  back?: { href: string; label: string }
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-2 text-ink-muted">
        <CloudOff className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-[22px] font-bold text-ink">{title}</h1>
      <p className="mt-2 text-ink-muted">
        This is usually the connection or the study server waking up. Try again in a few seconds; nothing you saved is lost.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
        {back && <Link href={back.href} className={buttonClass('secondary', 'md')}>{back.label}</Link>}
      </div>
      {error.digest && <p className="mt-6 text-xs text-ink-muted">Error code {error.digest}</p>}
    </div>
  )
}
