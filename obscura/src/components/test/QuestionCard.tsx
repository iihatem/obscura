import type { ReactNode } from 'react'

/** The question on its own card, the way study sessions show it. */
export function QuestionCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[min(36dvh,300px)] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center shadow-lift">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{label}</span>
      <span className="whitespace-pre-wrap font-headline text-[22px] font-bold leading-snug text-ink sm:text-[28px]">{children}</span>
    </div>
  )
}

/** The answer controls, pinned to the bottom in thumb reach. */
export function AnswerBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-paper/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  )
}
