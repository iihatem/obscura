import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

/** "p. 12" — ties a generated card to the lecture page it came from. */
export default function PageTag({ page, className }: { page?: number | null; className?: string }) {
  if (!page) return null
  return (
    <span
      title={`From page ${page} of the lecture`}
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted', className)}
    >
      <FileText className="h-3 w-3" aria-hidden />
      p. {page}
    </span>
  )
}
