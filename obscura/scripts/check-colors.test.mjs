import { describe, expect, it } from 'vitest'
import { findViolations } from './check-colors.mjs'

describe('findViolations', () => {
  it('flags raw colors', () => {
    const v = findViolations('<div className="bg-[#2A3741] text-stone-500 border-white material-symbols-outlined" />')
    expect(v.map((x) => x.rule)).toEqual(['hex color class', 'palette class', 'white/black class', 'Material Symbols'])
  })

  it('allows the tokens', () => {
    expect(findViolations('<div className="bg-paper text-ink-muted border-line ring-accent bg-good-soft" />')).toEqual([])
  })

  it('does not mistake other words for colors', () => {
    expect(findViolations('const redirectTo = "/sets"; // text-balance, border-2, to-do')).toEqual([])
  })
})
