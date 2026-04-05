'use client'

import { createContext, useCallback, useContext, useState } from 'react'

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = String(++_id)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              toast-animate-in flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl
              text-sm font-medium pointer-events-auto max-w-xs
              ${t.type === 'success' ? 'bg-[#051125] text-white' : ''}
              ${t.type === 'error' ? 'bg-[#ba1a1a] text-white' : ''}
              ${t.type === 'info' ? 'bg-[#1b263b] text-white' : ''}
            `}
          >
            <span
              className="material-symbols-outlined text-[16px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
