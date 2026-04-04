import type { Set } from '@/types'
import SetCard from './SetCard'
import EmptyState from '@/components/ui/EmptyState'

const StackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

interface SetGridProps {
  sets: Set[]
  emptyAction?: { label: string; href?: string; onClick?: () => void }
}

export default function SetGrid({ sets, emptyAction }: SetGridProps) {
  if (sets.length === 0) {
    return (
      <EmptyState
        icon={<StackIcon />}
        heading="No sets yet"
        subtext="Create your first set by uploading lecture slides or adding cards manually."
        action={emptyAction ?? { label: 'New set', href: '/sets/new' }}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sets.map((set) => (
        <SetCard key={set.id} set={set} />
      ))}
    </div>
  )
}
