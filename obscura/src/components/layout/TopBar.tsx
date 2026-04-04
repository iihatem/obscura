'use client'

import type { Profile } from '@/types'

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
}

export default function TopBar({ profile, onMenuClick }: TopBarProps) {
  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 md:hidden">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      <span className="text-base font-semibold tracking-tight text-stone-900">Obscura</span>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
        {initials}
      </div>
    </header>
  )
}
