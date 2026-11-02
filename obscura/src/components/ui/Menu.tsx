'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MenuProps {
  /** Renders the trigger; spread the props onto a button. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
}

/**
 * A dropdown on laptops and a sheet on phones. Unlike dialogs, menus hold
 * nothing that can be lost, so a click outside closes them.
 */
export default function Menu({ trigger, children, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    root.current?.querySelector<HTMLElement>('[role="menuitem"], [role="radio"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id })}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-scrim sm:hidden" aria-hidden onClick={close} />
          <div
            id={id}
            role="menu"
            className={cn(
              'z-50 border border-line bg-surface p-1.5 text-ink shadow-lift',
              'fixed inset-x-0 bottom-0 rounded-t-3xl pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3',
              'sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-[calc(100%+8px)] sm:w-60 sm:rounded-2xl sm:pb-1.5 sm:pt-1.5',
              align === 'end' ? 'sm:right-0' : 'sm:left-0',
              className
            )}
          >
            {children(close)}
          </div>
        </>
      )}
    </div>
  )
}

export function MenuItem({ onSelect, icon, children, tone = 'default', href }: {
  onSelect?: () => void
  icon?: ReactNode
  children: ReactNode
  tone?: 'default' | 'danger'
  href?: string
}) {
  const cls = cn(
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors sm:py-2 sm:text-sm',
    tone === 'danger' ? 'text-bad hover:bg-bad-soft' : 'text-ink hover:bg-paper-2'
  )
  if (href) {
    return <a role="menuitem" href={href} className={cls} onClick={onSelect}>{icon}{children}</a>
  }
  return <button role="menuitem" type="button" className={cls} onClick={onSelect}>{icon}{children}</button>
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-line" role="separator" />
}
