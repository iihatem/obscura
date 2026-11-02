'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = {
  primary: 'bg-ink text-on-ink hover:bg-ink/88',
  accent: 'bg-accent text-surface hover:bg-accent/90',
  secondary: 'bg-surface text-ink border border-line hover:border-ink-muted',
  ghost: 'text-ink-muted hover:bg-paper-2 hover:text-ink',
  danger: 'bg-bad text-surface hover:bg-bad/90',
}

export const buttonSizes = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-4.5 text-sm',
  lg: 'h-12 px-6 text-base',
}

/** Shared by Button and by links styled as buttons. */
export function buttonClass(variant: keyof typeof buttonVariants = 'primary', size: keyof typeof buttonSizes = 'md') {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold',
    'transition-[background-color,border-color,transform] active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    buttonVariants[variant],
    buttonSizes[size]
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonClass(variant, size), className)}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
