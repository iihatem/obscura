import { Skeleton, SkeletonSetGrid } from '@/components/ui/Skeleton'

export default function LibraryLoading() {
  return (
    <div className="p-8 lg:p-12 space-y-12">
      {/* Header */}
      <section className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </section>
      {/* Banner */}
      <Skeleton className="h-44 w-full rounded-xl" />
      {/* Grid */}
      <SkeletonSetGrid count={8} />
    </div>
  )
}
