import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

const variants = {
  default: 'bg-paper-2 text-ink-muted',
  accent: 'bg-accent-soft text-accent-ink',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  // Older names, kept so existing callers keep working.
  green: 'bg-good-soft text-good',
  blue: 'bg-accent-soft text-accent-ink',
  yellow: 'bg-warn-soft text-warn',
  red: 'bg-bad-soft text-bad',
  purple: 'bg-warn-soft text-warn',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export default function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
