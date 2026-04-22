'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  className?: string
  children: ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onClose={onClose}
      className={cn(
        'fixed inset-0 m-auto w-full max-w-md max-h-[90vh] overflow-y-auto',
        'rounded-xl border border-stone-200 bg-white p-0 shadow-lg',
        'backdrop:bg-black/40',
        'open:animate-in open:fade-in-0 open:zoom-in-95',
        className
      )}
    >
      <div className="p-6">
        {title && (
          <h2 className="text-lg font-semibold text-stone-900 mb-1">{title}</h2>
        )}
        {description && (
          <p className="text-sm text-stone-500 mb-4">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  )
}
