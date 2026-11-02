'use client'

import ErrorState from '@/components/ui/ErrorState'

export default function ExploreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Couldn't load Explore" back={{ href: '/library', label: 'Go to your library' }} />
}
