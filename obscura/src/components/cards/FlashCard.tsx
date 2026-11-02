'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { FlashCard as FlashCardType } from '@/types'
import { cn } from '@/lib/utils'
import IconButton from '@/components/ui/IconButton'
import PageTag from '@/components/ui/PageTag'

interface FlashCardProps {
  card: FlashCardType
  onEdit?: () => void
  onDelete?: () => void
  isOwner?: boolean
  className?: string
}

export default function FlashCard({ card, onEdit, onDelete, isOwner, className }: FlashCardProps) {
  return (
    <div className={cn('group rounded-2xl border border-line bg-surface', className)}>
      <div className="grid gap-px overflow-hidden rounded-2xl sm:grid-cols-2">
        <div className="p-4 sm:p-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Question</p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{card.front}</p>
        </div>
        <div className="border-t border-line p-4 sm:border-l sm:border-t-0 sm:p-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Answer</p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-muted">{card.back}</p>
        </div>
      </div>
      {(isOwner || card.source_page) && (
        <div className="flex items-center gap-1 border-t border-line px-3 py-1.5">
          <PageTag page={card.source_page} />
          {isOwner && (
            <span className="ml-auto flex gap-0.5">
              <IconButton label="Edit card" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" aria-hidden /></IconButton>
              <IconButton label="Delete card" size="sm" variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" aria-hidden /></IconButton>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
