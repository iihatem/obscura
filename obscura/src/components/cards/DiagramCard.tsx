'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { DiagramCard as DiagramCardType } from '@/types'
import { cn, proxyImageUrl } from '@/lib/utils'
import IconButton from '@/components/ui/IconButton'
import PageTag from '@/components/ui/PageTag'
import SuggestFixButton from '@/components/suggestions/SuggestFixButton'

interface DiagramCardProps {
  card: DiagramCardType
  onEdit?: () => void
  onDelete?: () => void
  /** Offered on other people's sets. */
  onSuggest?: () => void
  isOwner?: boolean
  className?: string
}

export default function DiagramCard({ card, onEdit, onDelete, onSuggest, isOwner, className }: DiagramCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <div className={cn('group overflow-hidden rounded-2xl border border-line bg-surface', className)}>
      {/* Overlay % coordinates only line up when the image keeps its natural
          aspect ratio (w-full h-auto) — no object-contain or fixed height. */}
      <div className="relative bg-paper-2">
        {!imgLoaded && <div className="aspect-video w-full animate-pulse bg-line" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxyImageUrl(card.image_url)}
          alt="Diagram"
          className={cn('block h-auto w-full', !imgLoaded && 'hidden')}
          onLoad={() => setImgLoaded(true)}
        />
        {imgLoaded && card.labels.map((lbl, i) => (
          <div
            key={i}
            className="absolute flex items-end overflow-hidden rounded-[3px] border-2 border-cover bg-cover/80"
            style={{ left: `${lbl.x}%`, top: `${lbl.y}%`, width: `${lbl.width}%`, height: `${lbl.height}%` }}
          >
            <span className="max-w-full truncate px-1 text-[10px] font-medium leading-tight text-on-cover">{lbl.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 py-1.5">
        <span className="px-1 text-[13px] text-ink-muted">
          {card.labels.length} {card.labels.length === 1 ? 'label' : 'labels'}
        </span>
        <PageTag page={card.source_page} />
        {!isOwner && onSuggest && <SuggestFixButton onClick={onSuggest} className="ml-auto" />}
        {isOwner && (
          <span className="ml-auto flex gap-0.5">
            <IconButton label="Edit diagram" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" aria-hidden /></IconButton>
            <IconButton label="Delete diagram" size="sm" variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" aria-hidden /></IconButton>
          </span>
        )}
      </div>
    </div>
  )
}
