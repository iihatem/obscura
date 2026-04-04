import Link from 'next/link'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  heading: string
  subtext?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export default function EmptyState({ icon, heading, subtext, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edeeef] text-[#45474d]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>{heading}</h3>
      {subtext && <p className="mt-1 text-sm text-[#45474d] max-w-xs">{subtext}</p>}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex h-9 items-center rounded-lg scholar-gradient px-4 text-sm font-bold text-white hover:opacity-90 transition-all"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex h-9 items-center rounded-lg scholar-gradient px-4 text-sm font-bold text-white hover:opacity-90 transition-all"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
