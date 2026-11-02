export interface SubjectChip {
  /** Lowercased, trimmed, spaces collapsed: the value filters compare on. */
  key: string
  /** The spelling most sets use. */
  label: string
  count: number
}

export function subjectKey(subject: string | null | undefined): string {
  return (subject ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Subjects as students typed them vary in case and spacing ("ANATOMY",
 * "Anatomy ", "anatomy"); they're one chip, labelled with the most common
 * spelling. The most-used subjects come first.
 */
export function subjectChips(sets: { subject: string | null }[], limit = 10): SubjectChip[] {
  const groups = new Map<string, Map<string, number>>()
  for (const s of sets) {
    const key = subjectKey(s.subject)
    if (!key) continue
    const spellings = groups.get(key) ?? new Map<string, number>()
    const label = s.subject!.trim().replace(/\s+/g, ' ')
    spellings.set(label, (spellings.get(label) ?? 0) + 1)
    groups.set(key, spellings)
  }
  return [...groups.entries()]
    .map(([key, spellings]) => {
      const sorted = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      return { key, label: sorted[0][0], count: sorted.reduce((n, [, c]) => n + c, 0) }
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}
