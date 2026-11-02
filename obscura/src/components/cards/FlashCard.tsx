'use client'

import type { FlashCard as FlashCardType } from '@/types'
import { cn } from '@/lib/utils'

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

interface FlashCardProps {
  card: FlashCardType
  onEdit?: () => void
  onDelete?: () => void
  isOwner?: boolean
  className?: string
}

export default function FlashCard({ card, onEdit, onDelete, isOwner, className }: FlashCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border border-line bg-surface',
        'grid grid-cols-[1fr_1px_1fr] overflow-hidden',
        className
      )}
    >
      {/* Front */}
      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-ink-muted mb-2">Front</p>
        <p className="text-sm text-ink leading-relaxed line-clamp-4">{card.front}</p>
      </div>

      {/* Divider */}
      <div className="bg-paper-2" />

      {/* Back */}
      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-ink-muted mb-2">Back</p>
        <p className="text-sm text-ink-muted leading-relaxed line-clamp-4">{card.back}</p>
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="absolute right-2 top-2 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-line text-ink-muted shadow-sm hover:text-ink transition-colors"
            aria-label="Edit card"
          >
            <EditIcon />
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-line text-ink-muted shadow-sm hover:text-bad hover:border-bad-soft transition-colors"
            aria-label="Delete card"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
