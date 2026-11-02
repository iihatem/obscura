import { Skeleton, SkeletonHeader, SkeletonFlashCard } from '@/components/ui/Skeleton'

export default function SetDetailLoading() {
  return (
    <>
      <SkeletonHeader />
      <div className="flex items-center justify-between py-1">
        <Skeleton className="h-10 w-56 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonFlashCard key={i} />
        ))}
      </div>
    </>
  )
}
