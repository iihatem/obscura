'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  /**
   * Asked to close — by Escape or the close button. The modal only closes once
   * `open` turns false, so a handler can confirm first. A click on the
   * backdrop never closes it: dialogs here hold uploads and edits in progress,
   * and a stray click (or a text selection dragged past the edge) would lose them.
   */
  onClose: () => void
  title?: string
  description?: string
  className?: string
  children: ReactNode
}

/** Centered on laptops; a sheet that rises from the bottom on phones. */
export default function Modal({
  open,
  onClose,
  title,
  description,
  className,
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

  // Escape fires `cancel`, which would close the dialog natively before the
  // parent had a say. Route it through onClose instead.
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'dialog-animate fixed inset-0 overflow-y-auto overscroll-contain border border-line bg-surface p-0 text-ink shadow-lift',
        'backdrop:bg-scrim',
        // Phone: a bottom sheet, full width, clear of the home indicator.
        'mx-0 mb-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl pb-[env(safe-area-inset-bottom)]',
        // Laptop: a centered dialog.
        'sm:m-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl sm:pb-0',
        className
      )}
    >
      <div className="relative p-5 sm:p-6">
        <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {title && (
          <h2 id={titleId} className="mb-1 pr-10 text-[22px] font-bold text-ink">{title}</h2>
        )}
        {description && (
          <p className="mb-5 text-sm text-ink-muted">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  )
}
