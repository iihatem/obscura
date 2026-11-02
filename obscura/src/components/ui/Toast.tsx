'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

// ─── Provider ───────────────────────────────────────────────────────────────

let _id = 0

const icons = { success: CircleCheck, error: CircleAlert, info: Info }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = String(++_id)
    setToasts((prev) => [...prev, { id, message, type }])
    // Errors usually carry a next step, so they stay long enough to read it.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, type === 'error' ? 6000 : 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Above the phone's floating nav pill; bottom-right on laptops. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[9999] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={cn(
                'toast-animate-in pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lift',
                t.type === 'error' ? 'bg-bad text-surface' : 'bg-ink text-on-ink'
              )}
            >
              <Icon className="mt-px h-4 w-4 shrink-0" aria-hidden />
              {t.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
