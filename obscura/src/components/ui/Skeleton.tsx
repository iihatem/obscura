import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-[#e7e8e9]', className)} />
  )
}

export function SkeletonSetCard() {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-6 border border-[#e7e8e9]">
      <Skeleton className="h-3 w-16" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <Skeleton className="h-3 w-24" />
      <div className="pt-4 border-t border-[#edeeef] flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export function SkeletonSetGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSetCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonFlashCard() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[#e7e8e9] bg-white p-5">
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="w-px self-stretch bg-[#edeeef]" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonHeader() {
  return (
    <div className="bg-white border-b border-[#e7e8e9] px-6 py-5 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
