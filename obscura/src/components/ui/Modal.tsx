'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  /**
   * Asked to close — by Escape, the backdrop or the close button. The modal
   * only closes once `open` turns false, so a handler can confirm first.
   */
  onClose: () => void
  title?: string
  description?: string
  className?: string
  /** Editors hold unsaved work: a stray backdrop click shouldn't discard it. */
  dismissOnBackdrop?: boolean
  children: ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  className,
  dismissOnBackdrop = true,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (dismissOnBackdrop && e.target === ref.current) onClose()
  }

  // Escape fires `cancel`, which would close the dialog natively before the
  // parent had a say. Route it through onClose instead.
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onCancel={handleCancel}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'fixed inset-0 m-auto w-full max-w-md max-h-[90vh] overflow-y-auto',
        'rounded-xl border border-stone-200 bg-white p-0 shadow-lg',
        'backdrop:bg-black/40',
        'open:animate-in open:fade-in-0 open:zoom-in-95',
        className
      )}
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>close</span>
        </button>
        {title && (
          <h2 id={titleId} className="text-lg font-semibold text-stone-900 mb-1 pr-8">{title}</h2>
        )}
        {description && (
          <p className="text-sm text-stone-500 mb-4">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  )
}
