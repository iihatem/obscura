'use client'

import ErrorState from '@/components/ui/ErrorState'

export default function SetError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Couldn't load this set" back={{ href: '/library', label: 'Back to your library' }} />
}
