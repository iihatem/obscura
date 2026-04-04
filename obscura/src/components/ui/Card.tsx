import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const padding = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof padding
}

export default function Card({ padding: p = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stone-200 bg-white shadow-sm',
        padding[p],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
