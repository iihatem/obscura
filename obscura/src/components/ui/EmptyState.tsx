import Link from 'next/link'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { buttonClass } from './buttonStyles'

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
    <div className={cn('flex flex-col items-center justify-center px-4 py-20 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-ink">{heading}</h3>
      {subtext && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{subtext}</p>}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link href={action.href} className={buttonClass('primary', 'md')}>{action.label}</Link>
          ) : (
            <button type="button" onClick={action.onClick} className={buttonClass('primary', 'md')}>{action.label}</button>
          )}
        </div>
      )}
    </div>
  )
}
