import { Skeleton, SkeletonSetGrid } from '@/components/ui/Skeleton'

export default function ExploreLoading() {
  return (
    <div className="flex flex-col gap-6 py-4 sm:py-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full max-w-sm rounded-full" />
      <div className="flex gap-2">
        {['w-12', 'w-24', 'w-20', 'w-28', 'w-16'].map((w, i) => (
          <Skeleton key={i} className={`h-9 rounded-full ${w}`} />
        ))}
      </div>
      <SkeletonSetGrid count={6} />
    </div>
  )
}
