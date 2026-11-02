import { describe, expect, it } from 'vitest'
import { cleanQuery, flatten, groupResults, titleOrSubject } from './search'

const hit = (id: string) => ({ id, title: id, subject: null, card_count: 1 })

describe('cleanQuery', () => {
  it('strips characters that would break the PostgREST filter', () => {
    expect(cleanQuery('chem, (organic)*%_\\')).toBe('chem organic')
  })

  it('keeps accented letters and course codes', () => {
    expect(cleanQuery('  Biología  BIO-110 ')).toBe('Biología BIO-110')
  })

  it('caps very long input', () => {
    expect(cleanQuery('a'.repeat(200))).toHaveLength(80)
  })
})

describe('titleOrSubject', () => {
  it('builds a case-insensitive title or subject match', () => {
    expect(titleOrSubject('cell')).toBe('title.ilike.*cell*,subject.ilike.*cell*')
  })
})

describe('groupResults', () => {
  it('drops public hits the user already owns', () => {
    const groups = groupResults([hit('a')], [hit('a'), hit('b')])
    expect(groups.public.map((s) => s.id)).toEqual(['b'])
    expect(flatten(groups).map((s) => s.id)).toEqual(['a', 'b'])
  })
})
