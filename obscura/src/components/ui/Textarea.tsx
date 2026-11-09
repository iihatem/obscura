'use client'

import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'
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

    const fit = useCallback(() => {
      const el = inner.current
      if (!el) return
      el.style.height = 'auto'
      // Inside a dialog that hasn't opened yet there's nothing to measure. Keep
      // the rows height rather than shrinking to a sliver; it's fitted on open.
      if (!el.scrollHeight || !el.clientWidth) return
      el.style.height = `${el.scrollHeight + 2}px`
    }, [])

    useLayoutEffect(fit, [value, fit])

    // Fit again when it gets a size or a new width: a dialog opening, a phone turning.
    useEffect(() => {
      const el = inner.current
      if (!el || typeof ResizeObserver === 'undefined') return
      let width = el.clientWidth
      const observer = new ResizeObserver(() => {
        if (el.clientWidth === width) return
        width = el.clientWidth
        fit()
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [fit])

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
