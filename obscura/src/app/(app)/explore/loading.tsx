import { Skeleton, SkeletonSetGrid } from '@/components/ui/Skeleton'

export default function ExploreLoading() {
  return (
    <div className="p-8 lg:p-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {/* Search */}
      <Skeleton className="h-10 w-80 max-w-full rounded-lg" />
      {/* Subject chips */}
      <div className="flex gap-2">
        {['w-16', 'w-12', 'w-20', 'w-14', 'w-16'].map((w, i) => (
          <Skeleton key={i} className={`h-7 rounded-full ${w}`} />
        ))}
      </div>
      {/* Grid */}
      <SkeletonSetGrid count={8} />
    </div>
  )
}
