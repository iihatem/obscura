import Link from 'next/link'
import type { Set } from '@/types'

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

interface SetCardProps {
  set: Set
}

export default function SetCard({ set }: SetCardProps) {
  return (
    <Link
      href={`/sets/${set.id}`}
      className="group flex flex-col gap-4 rounded-xl bg-white p-6 border border-[#e7e8e9] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300"
    >
      {/* Subject tag */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#006972]">
              {set.subject}
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-[#c5c6cd] group-hover:text-[#051125] transition-colors text-[18px]">
          more_vert
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold text-[#051125] leading-snug group-hover:text-[#006972] transition-colors line-clamp-2"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        {set.title}
      </h3>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[#45474d] font-medium">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">quiz</span>
          {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#edeeef]">
        <span className="text-xs text-[#75777d]">{relativeDate(set.updated_at)}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: set.visibility === 'public' ? '#006972' : '#75777d' }}
        >
          {set.visibility}
        </span>
      </div>
    </Link>
  )
}
