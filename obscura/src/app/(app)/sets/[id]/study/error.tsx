'use client'

import ErrorState from '@/components/ui/ErrorState'

export default function StudyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Couldn't start this session" back={{ href: '/library', label: 'Back to your library' }} />
}
