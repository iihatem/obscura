'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import type { Profile } from '@/types'
import { ToastProvider } from '@/components/ui/Toast'
import OnboardingProvider from '@/components/onboarding/OnboardingProvider'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import IconButton from '@/components/ui/IconButton'
import PillNav from './PillNav'
import AvatarMenu from './AvatarMenu'
import SearchDialog from './SearchDialog'

interface AppShellProps {
  profile: Profile | null
  children: React.ReactNode
}

/** Study sessions take the whole screen: no bar, no pill. */
export function isFocusRoute(pathname: string) {
  return /^\/sets\/[^/]+\/study(\/|$)/.test(pathname)
}

export function Logo() {
  return (
    <Link href="/library" className="flex items-center gap-2.5" aria-label="Obscura, go to your library">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/frog.svg" alt="" className="h-7 w-7 rounded-md" />
      <span className="font-headline text-lg font-extrabold tracking-tight text-ink">Obscura</span>
    </Link>
  )
}

export default function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname()
  const focus = isFocusRoute(pathname)
  const [searchOpen, setSearchOpen] = useState(false)
  const [pillHidden, setPillHidden] = useState(false)

  // ⌘K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Phones: hide the pill while scrolling down or typing, so it never covers
  // what you're reading or the field you're filling in.
  useEffect(() => {
    let last = window.scrollY
    let typing = false
    function onScroll() {
      const y = window.scrollY
      if (!typing) setPillHidden(y > last && y > 80)
      last = y
    }
    function onFocusIn(e: FocusEvent) {
      const t = e.target as HTMLElement
      typing = t.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, [contenteditable="true"]')
      setPillHidden(typing)
    }
    function onFocusOut() {
      typing = false
      setPillHidden(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return (
    <ToastProvider>
      <OnboardingProvider>
        {focus ? (
          <div className="min-h-dvh bg-paper">{children}</div>
        ) : (
          <div className="min-h-dvh bg-paper">
            <header className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:h-[72px] sm:px-6">
              <Logo />
              <div className="flex-1" />
              <IconButton label="Search (⌘K)" variant="outline" onClick={() => setSearchOpen(true)}>
                <Search className="h-[18px] w-[18px]" aria-hidden />
              </IconButton>
              <Link href="/sets/new" className={cn(buttonClass('primary', 'md'), 'hidden sm:inline-flex')}>
                <Plus className="h-4 w-4" aria-hidden />
                New set
              </Link>
              <AvatarMenu profile={profile} />
            </header>
            <PillNav hidden={pillHidden} />
            <main className="mx-auto w-full max-w-6xl px-4 pb-32 sm:px-6 sm:pb-16">{children}</main>
            <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} userId={profile?.id ?? null} />
          </div>
        )}
      </OnboardingProvider>
    </ToastProvider>
  )
}
