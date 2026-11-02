import { Skeleton } from '@/components/ui/Skeleton'

export default function StudyLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b border-line px-3 pb-3 pt-2 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <Skeleton className="h-[min(52dvh,420px)] w-full max-w-xl rounded-3xl" />
      </div>
      <div className="border-t border-line px-4 py-3">
        <Skeleton className="mx-auto h-12 w-full max-w-xl rounded-full" />
      </div>
    </div>
  )
}
