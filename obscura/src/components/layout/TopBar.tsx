'use client'

import type { Profile } from '@/types'

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
}

export default function TopBar({ profile, onMenuClick }: TopBarProps) {
  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="flex h-14 items-center justify-between bg-[#E6E6E2]/90 backdrop-blur-xl border-b border-[#BABAB6]/20 px-4 md:hidden sticky top-0 z-40">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4A5558] hover:bg-[#D8D8D4] transition-colors"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/frog.svg" alt="Obscura logo" className="w-6 h-6 rounded-sm" />
        <span
          className="text-base font-black tracking-tight text-[#2A3741]"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          Obscura
        </span>
      </div>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A3741] text-xs font-semibold text-[#E6E6E2]">
        {initials}
      </div>
    </header>
  )
}
