'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const LibraryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const ExploreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const navLinks = [
  { href: '/library', label: 'Library', icon: <LibraryIcon /> },
  { href: '/explore', label: 'Explore', icon: <ExploreIcon /> },
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
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-stone-200',
          'transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Wordmark */}
        <div className="flex h-14 items-center px-5 border-b border-stone-100">
          <span className="text-base font-semibold tracking-tight text-stone-900">Obscura</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navLinks.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                )}
              >
                <span className={active ? 'text-stone-700' : 'text-stone-400'}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-stone-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 mb-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <span className="truncate text-sm font-medium text-stone-800">
              {profile?.display_name ?? 'You'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
