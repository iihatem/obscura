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
    <header className="flex h-14 items-center justify-between bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-[#c5c6cd]/20 px-4 md:hidden sticky top-0 z-40">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#45474d] hover:bg-[#edeeef] transition-colors"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <span
        className="text-base font-black tracking-tight text-[#051125]"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        Obscura
      </span>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#051125] text-xs font-semibold text-white">
        {initials}
      </div>
    </header>
  )
}
