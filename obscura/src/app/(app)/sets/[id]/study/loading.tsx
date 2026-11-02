import { Skeleton } from '@/components/ui/Skeleton'

export default function StudyLoading() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Progress header */}
      <div className="bg-paper/90 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-end justify-between mb-3">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      {/* Card placeholder */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
