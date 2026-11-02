import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** 0 to 1. */
  value: number
  label: string
  tone?: 'accent' | 'warn' | 'bad'
  className?: string
}

export default function ProgressBar({ value, label, tone = 'accent', className }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tone === 'accent' ? 'bg-accent' : tone === 'warn' ? 'bg-warn' : 'bg-bad')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
