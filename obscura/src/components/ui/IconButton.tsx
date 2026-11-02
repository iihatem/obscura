'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Read by screen readers and shown as the tooltip. */
  label: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'outline' | 'danger'
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', variant = 'ghost', className, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        variant === 'ghost' && 'text-ink-muted hover:bg-paper-2 hover:text-ink',
        variant === 'outline' && 'border border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink',
        variant === 'danger' && 'text-ink-muted hover:bg-bad-soft hover:text-bad',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)

IconButton.displayName = 'IconButton'

export default IconButton
