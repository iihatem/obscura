'use client'

import { useSyncExternalStore } from 'react'
import { localDate } from '@/lib/reviewPlan'

// The student's own calendar date. The server doesn't know their time zone,
// so this is null until the page is running in the browser.

function subscribe(onChange: () => void) {
  // A tab left open overnight moves on to the next day when it's looked at again.
  document.addEventListener('visibilitychange', onChange)
  const timer = setInterval(onChange, 60_000)
  return () => {
    document.removeEventListener('visibilitychange', onChange)
    clearInterval(timer)
  }
}

export function useLocalToday(): string | null {
  return useSyncExternalStore(subscribe, () => localDate(), () => null)
}
