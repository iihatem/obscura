export interface SearchHit {
  id: string
  title: string
  subject: string | null
  card_count: number
}

export interface SearchGroups {
  mine: SearchHit[]
  public: SearchHit[]
}

/**
 * PostgREST's `or=(...)` filter treats commas, parentheses and backslashes as
 * syntax, and `%`/`*`/`_` as wildcards, so a query like "chem, (organic)" would
 * break the request or match everything. Keep letters, digits, spaces and
 * common punctuation only.
 */
export function cleanQuery(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s'.:&+-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** The `or` filter matching a title or subject. */
export function titleOrSubject(q: string): string {
  return `title.ilike.*${q}*,subject.ilike.*${q}*`
}

/** A public set the user also owns is shown once, under their own sets. */
export function groupResults(mine: SearchHit[], publicHits: SearchHit[]): SearchGroups {
  const own = new Set(mine.map((s) => s.id))
  return { mine, public: publicHits.filter((s) => !own.has(s.id)) }
}

export function flatten(groups: SearchGroups): SearchHit[] {
  return [...groups.mine, ...groups.public]
}
