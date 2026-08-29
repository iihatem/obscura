'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import OnboardingModal from './OnboardingModal'
import { isOnboardingDismissed } from '@/lib/onboarding'

interface OnboardingContextValue {
  /** Re-open the walkthrough on demand (sidebar "How it works"). */
  openOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextValue>({ openOnboarding: () => {} })

export function useOnboarding() {
  return useContext(OnboardingContext)
}

export default function OnboardingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  // Read the flag after mount only: localStorage doesn't exist during the
  // server render, and reading it in initial state would desync hydration.
  useEffect(() => {
    if (!isOnboardingDismissed()) setOpen(true)
  }, [])

  const openOnboarding = useCallback(() => setOpen(true), [])

  return (
    <OnboardingContext.Provider value={{ openOnboarding }}>
      {children}
      <OnboardingModal open={open} onClose={() => setOpen(false)} />
    </OnboardingContext.Provider>
  )
}
