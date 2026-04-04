'use client'

import Image from 'next/image'
import type { DiagramCard as DiagramCardType } from '@/types'
import { cn } from '@/lib/utils'

interface DiagramCardProps {
  card: DiagramCardType
  onEdit?: () => void
  onDelete?: () => void
  isOwner?: boolean
  className?: string
}

export default function DiagramCard({ card, onEdit, onDelete, isOwner, className }: DiagramCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border border-stone-200 bg-white overflow-hidden',
        className
      )}
    >
      {/* Image with label overlays */}
      <div className="relative aspect-video bg-stone-100">
        <Image
          src={card.image_url}
          alt="Diagram"
          fill
          className="object-contain"
          unoptimized
        />
        {/* Label boxes */}
        {card.labels.map((lbl, i) => (
          <div
            key={i}
            className="absolute border-2 border-sky-400/80 bg-sky-400/10 flex items-end"
            style={{
              left: `${lbl.x}%`,
              top: `${lbl.y}%`,
              width: `${lbl.width}%`,
              height: `${lbl.height}%`,
            }}
          >
            <span className="bg-sky-500 text-white text-[9px] font-medium px-1 leading-tight truncate max-w-full">
              {lbl.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-xs text-stone-500">
          {card.labels.length} {card.labels.length === 1 ? 'label' : 'labels'}
        </span>

        {/* Actions */}
        {isOwner && (
          <div className="hidden items-center gap-1 group-hover:flex">
            <button
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
              aria-label="Edit card"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 transition-colors"
              aria-label="Delete card"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
