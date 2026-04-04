'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const navLinks = [
  { href: '/library', label: 'My Library', icon: 'menu_book' },
  { href: '/explore', label: 'Explore', icon: 'explore' },
]

interface SidebarProps {
  profile: Profile | null
  open: boolean
  onClose: () => void
}

export default function Sidebar({ profile, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '??'

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-50 border-r-0',
          'transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Wordmark */}
        <div className="mb-10 px-8 pt-6">
          <h1
            className="font-black text-xl text-[#051125] tracking-tight"
            style={{ fontFamily: 'var(--font-manrope)' }}
          >
            Obscura AI
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#45474d] opacity-60 mt-0.5">
            The Digital Curator
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-1">
          {navLinks.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:translate-x-1',
                  active
                    ? 'bg-[#006972]/10 text-[#006972] font-bold'
                    : 'text-slate-600 hover:bg-slate-200'
                )}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto px-4 pb-6 space-y-4">
          {/* New Upload CTA */}
          <Link
            href="/sets/new"
            onClick={onClose}
            className="w-full scholar-gradient text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Upload
          </Link>

          {/* Divider + user actions */}
          <div className="pt-4 border-t border-slate-200/50 space-y-1">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#051125] text-xs font-semibold text-white">
                {initials}
              </div>
              <span className="truncate text-sm font-medium text-[#191c1d]">
                {profile?.display_name ?? 'You'}
              </span>
            </div>
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-[#191c1d] transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
              Help
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-[#191c1d] transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
