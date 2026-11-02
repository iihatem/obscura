import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-paper-2', className)} />
}

export function SkeletonSetCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <Skeleton className="h-3 w-16" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="flex justify-between border-t border-line pt-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export function SkeletonSetGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSetCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonFlashCard() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="w-px self-stretch bg-line" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonHeader() {
  return (
    <div className="py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  )
}
