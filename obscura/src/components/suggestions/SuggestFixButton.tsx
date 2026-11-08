'use client'

import { MessageSquarePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The quiet per-card action on sets the viewer doesn't own. */
export default function SuggestFixButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink',
        className
      )}
    >
      <MessageSquarePlus className="h-4 w-4" aria-hidden />
      Suggest a fix
    </button>
  )
}
