'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleHelp, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import Menu, { MenuItem, MenuSeparator } from '@/components/ui/Menu'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { createClient } from '@/lib/supabase/client'
import { clearAllDrafts } from '@/lib/drafts'
import { applyTheme, parseTheme, THEME_COOKIE, type Theme } from '@/lib/theme'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import type { Profile } from '@/types'

export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export default function AvatarMenu({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const { openOnboarding } = useOnboarding()
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`))
    setTheme(parseTheme(m?.[1]))
  }, [])

  function changeTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  async function signOut() {
    await createClient().auth.signOut()
    await clearAllDrafts()
    router.push('/login')
    router.refresh()
  }

  return (
    <Menu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label="Account menu"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent-ink ring-offset-2 ring-offset-paper transition hover:ring-2 hover:ring-line"
        >
          {initialsOf(profile?.display_name)}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold text-ink">{profile?.display_name || 'Your account'}</p>
          </div>
          <MenuItem href="/profile" onSelect={close} icon={<UserRound className="h-4 w-4 text-ink-muted" aria-hidden />}>Profile</MenuItem>
          <MenuItem onSelect={() => { close(); openOnboarding() }} icon={<CircleHelp className="h-4 w-4 text-ink-muted" aria-hidden />}>How Obscura works</MenuItem>
          <MenuSeparator />
          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="text-sm text-ink-muted">Theme</span>
            <SegmentedControl
              size="sm"
              label="Theme"
              value={theme}
              onChange={changeTheme}
              options={[
                { value: 'system', label: <span className="sr-only">System</span>, icon: <Monitor className="h-3.5 w-3.5" aria-hidden /> },
                { value: 'light', label: <span className="sr-only">Light</span>, icon: <Sun className="h-3.5 w-3.5" aria-hidden /> },
                { value: 'dark', label: <span className="sr-only">Dark</span>, icon: <Moon className="h-3.5 w-3.5" aria-hidden /> },
              ]}
            />
          </div>
          <MenuSeparator />
          <MenuItem tone="danger" onSelect={signOut} icon={<LogOut className="h-4 w-4" aria-hidden />}>Sign out</MenuItem>
        </>
      )}
    </Menu>
  )
}
