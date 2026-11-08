'use client'

import ErrorState from '@/components/ui/ErrorState'

export default function TestError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Couldn't start this test" back={{ href: '/library', label: 'Back to your library' }} />
}
