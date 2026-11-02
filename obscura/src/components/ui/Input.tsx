'use client'

import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const fieldClass =
  'w-full rounded-lg border bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-muted/80 ' +
  'transition-[border-color,box-shadow] focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id: idProp, ...props }, ref) => {
    const generatedId = useId()
    const id = idProp ?? generatedId
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClass, 'h-11', error ? 'border-bad focus:border-bad focus:ring-bad/20' : 'border-line', className)}
          {...props}
        />
        {error ? (
          <p id={`${id}-error`} className="text-[13px] text-bad">{error}</p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-[13px] text-ink-muted">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
