import Link from 'next/link'
import type { Set } from '@/types'
import Badge from '@/components/ui/Badge'

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

const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const visibilityConfig = {
  public: { icon: <GlobeIcon />, label: 'Public', className: 'text-emerald-600' },
  link: { icon: <LinkIcon />, label: 'Link', className: 'text-sky-600' },
  private: { icon: <LockIcon />, label: 'Private', className: 'text-stone-400' },
}

interface SetCardProps {
  set: Set
}

export default function SetCard({ set }: SetCardProps) {
  const vis = visibilityConfig[set.visibility]

  return (
    <Link
      href={`/sets/${set.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {set.subject && (
            <Badge variant="default">{set.subject}</Badge>
          )}
        </div>
        <span className={`flex items-center gap-1 shrink-0 text-xs ${vis.className}`}>
          {vis.icon}
          <span className="sr-only">{vis.label}</span>
        </span>
      </div>

      <h3 className="text-sm font-semibold text-stone-900 leading-snug group-hover:text-stone-700 line-clamp-2">
        {set.title}
      </h3>

      <div className="flex items-center gap-2 text-xs text-stone-400 mt-auto">
        <span>{set.card_count} {set.card_count === 1 ? 'card' : 'cards'}</span>
        <span>·</span>
        <span>{relativeDate(set.updated_at)}</span>
      </div>
    </Link>
  )
}
