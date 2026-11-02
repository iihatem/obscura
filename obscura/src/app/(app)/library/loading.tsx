import { Skeleton, SkeletonSetGrid } from '@/components/ui/Skeleton'

export default function LibraryLoading() {
  return (
    <div className="flex flex-col gap-8 py-4 sm:py-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-28 w-full rounded-3xl" />
      <SkeletonSetGrid count={6} />
    </div>
  )
}
