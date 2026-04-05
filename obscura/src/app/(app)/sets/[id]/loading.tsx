import { Skeleton, SkeletonHeader, SkeletonFlashCard } from '@/components/ui/Skeleton'

export default function SetDetailLoading() {
  return (
    <>
      <SkeletonHeader />
      {/* Tabs bar */}
      <div className="border-b border-[#e7e8e9] bg-white px-6 lg:px-8 py-3 flex gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      {/* Card list */}
      <div className="p-6 lg:p-8 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonFlashCard key={i} />
        ))}
      </div>
    </>
  )
}
