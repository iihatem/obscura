'use client'

import ErrorState from '@/components/ui/ErrorState'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Something went wrong" back={{ href: '/library', label: 'Go to your library' }} />
}
