'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Compass, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const NAV = [
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/explore', label: 'Explore', icon: Compass },
] as const

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The floating pill. Laptops pin it at the top center; phones float it above
 * the bottom edge with New set at its end, and tuck it away while scrolling down.
 */
export default function PillNav({ hidden }: { hidden: boolean }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed left-1/2 z-40 -translate-x-1/2 transition-transform duration-300',
        'bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-auto sm:top-3',
        hidden && 'translate-y-[calc(100%+2rem)] sm:translate-y-0'
      )}
    >
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-lift backdrop-blur">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 font-medium transition-colors',
                'h-12 flex-col justify-center gap-0.5 text-[11px] sm:h-9 sm:flex-row sm:gap-2 sm:text-sm',
                active ? 'bg-ink text-on-ink' : 'text-ink-muted hover:text-ink'
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.9} aria-hidden />
              {label}
            </Link>
          )
        })}
        <span className="mx-0.5 h-7 w-px bg-line sm:hidden" aria-hidden />
        <Link
          href="/sets/new"
          aria-label="New set"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-surface sm:hidden"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </nav>
  )
}
