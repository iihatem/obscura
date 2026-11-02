'use client'

import { forwardRef, useCallback, useId, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { fieldClass } from './Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

/** Grows with its content, so long answers never hide behind a scrollbar. */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id: idProp, value, rows = 2, ...props }, forwarded) => {
    const generatedId = useId()
    const id = idProp ?? generatedId
    const inner = useRef<HTMLTextAreaElement | null>(null)

    const setRef = useCallback((el: HTMLTextAreaElement | null) => {
      inner.current = el
      if (typeof forwarded === 'function') forwarded(el)
      else if (forwarded) forwarded.current = el
    }, [forwarded])

    useLayoutEffect(() => {
      const el = inner.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight + 2}px`
    }, [value])

    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>}
        <textarea
          ref={setRef}
          id={id}
          rows={rows}
          value={value}
          aria-invalid={error ? true : undefined}
          className={cn(fieldClass, 'resize-none py-2.5 leading-relaxed', error ? 'border-bad' : 'border-line', className)}
          {...props}
        />
        {error ? <p className="text-[13px] text-bad">{error}</p> : hint ? <p className="text-[13px] text-ink-muted">{hint}</p> : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
