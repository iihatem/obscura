'use client'

import CellDiagram, { CELL_LABELS } from './CellDiagram'
import CoveredDiagram from './CoveredDiagram'

export default function DiagramDemo() {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 shadow-lift sm:p-5">
      <div className="flex items-center justify-between text-[13px] text-ink-muted">
        <span><b className="font-semibold text-ink">BIO 110 · Cell structure</b> · slide 5</span>
        <span className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[11px] font-semibold">p. 5</span>
      </div>
      <CoveredDiagram image={<CellDiagram className="block h-auto w-full" />} labels={CELL_LABELS} />
    </div>
  )
}
