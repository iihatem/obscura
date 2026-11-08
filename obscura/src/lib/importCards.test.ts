import { describe, expect, it } from 'vitest'
import {
  BULK_LIMIT, MAX_FIELD_LENGTH, chunk, detectSeparators, fileKind, looksLikeHtml, parseCards,
  prepareSource, readAnkiHeader, splitRecords, stripHtml, toBulkChunks, type Source,
} from './importCards'

/** Parse a source the way the dialog does before the student changes anything. */
function importSource(source: Source) {
  const { separators, fixed } = prepareSource(source)
  return parseCards(source.text, { ...separators, ...fixed })
}

const pairs = (text: string, origin: Source['origin'] = 'paste') =>
  importSource({ text, origin }).rows.map((r) => [r.front, r.back])

describe('detectSeparators', () => {
  it('prefers tab, then " - ", then comma', () => {
    expect(detectSeparators('cell\tunit of life\natom\tsmallest unit').field).toBe('tab')
    expect(detectSeparators('cell - unit of life\natom - smallest, simplest').field).toBe('dash')
    expect(detectSeparators('cell,unit of life\natom,smallest unit').field).toBe('comma')
  })

  it('picks tab even when definitions hold commas and dashes', () => {
    expect(detectSeparators('a\tb, c - d\ne\tf, g').field).toBe('tab')
  })

  it('ignores a stray line without the separator', () => {
    expect(detectSeparators('Biology\ncell\tunit\natom\tsmall').field).toBe('tab')
  })

  it('splits cards on new lines, or semicolons when it is one line', () => {
    expect(detectSeparators('a\tb\nc\td').row).toBe('newline')
    expect(detectSeparators('a\tb;c\td;e\tf').row).toBe('semicolon')
  })

  it('falls back to tab and new line', () => {
    expect(detectSeparators('just one line')).toEqual({ field: 'tab', row: 'newline' })
  })
})

describe('splitRecords', () => {
  it('splits plain fields', () => {
    expect(splitRecords('a\tb\nc\td', '\t', '\n', false)).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('keeps commas and new lines inside quotes', () => {
    expect(splitRecords('"a, b","line 1\nline 2"\nc,d', ',', '\n', true)).toEqual([['a, b', 'line 1\nline 2'], ['c', 'd']])
  })

  it('reads doubled quotes as one quote', () => {
    expect(splitRecords('"say ""hi""",greeting', ',', '\n', true)).toEqual([['say "hi"', 'greeting']])
  })

  it('leaves a quote that does not close cleanly as text', () => {
    expect(splitRecords('"To be" or not\tHamlet', '\t', '\n', true)).toEqual([['"To be" or not', 'Hamlet']])
  })

  it('treats quotes as text when quoting is off', () => {
    expect(splitRecords('"To be"\tHamlet', '\t', '\n', false)).toEqual([['"To be"', 'Hamlet']])
  })

  it('keeps an empty last field', () => {
    expect(splitRecords('a\t', '\t', '\n', false)).toEqual([['a', '']])
  })

  it('handles multi-character custom separators', () => {
    expect(splitRecords('a::b||c::d', '::', '||', false)).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('parseCards', () => {
  it('reads a default Quizlet export', () => {
    expect(pairs('mitosis\tcell division\nATP\tenergy currency\n')).toEqual([
      ['mitosis', 'cell division'],
      ['ATP', 'energy currency'],
    ])
  })

  it('handles CRLF and old Mac line endings', () => {
    expect(pairs('a\tb\r\nc\td\re\tf')).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f']])
  })

  it('skips empty and whitespace-only lines', () => {
    expect(pairs('\n\na\tb\n   \n\t\nc\td\n\n')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('reads " - " pastes and keeps later dashes in the answer', () => {
    expect(pairs('pH - a measure - of acidity')).toEqual([['pH', 'a measure - of acidity']])
  })

  it('reads Quizlet semicolon and custom separators', () => {
    const res = parseCards('a|b@@c|d', { field: 'custom', customField: '|', row: 'custom', customRow: '@@' })
    expect(res.rows.map((r) => [r.front, r.back])).toEqual([['a', 'b'], ['c', 'd']])
    expect(pairs('a\tb;c\td')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('accepts \\t and \\n typed as custom separators', () => {
    const res = parseCards('a\tb\nc\td', { field: 'custom', customField: '\\t', row: 'custom', customRow: '\\n' })
    expect(res.rows).toHaveLength(2)
  })

  it('reads a CSV with quoted commas and a header row', () => {
    expect(pairs('Front,Back\n"Na, K",alkali metals\nH2O,"water, the ""universal solvent"""', 'csv')).toEqual([
      ['Na, K', 'alkali metals'],
      ['H2O', 'water, the "universal solvent"'],
    ])
  })

  it('only drops a first row that looks like column names', () => {
    expect(pairs('Term\tDefinition\na\tb')).toEqual([['a', 'b']])
    expect(pairs('Front\tthe forward part\na\tb')).toHaveLength(2)
  })

  it('reads a TSV file and ignores extra columns', () => {
    expect(pairs('a\tb\textra\tmore', 'tsv')).toEqual([['a', 'b']])
  })

  it('flags rows missing a side', () => {
    const res = importSource({ text: 'a\tb\nlonely term\n\tno front\nc\t   ', origin: 'paste' })
    expect(res.rows.map((r) => r.issues)).toEqual([[], ['no-back'], ['no-front'], ['no-back']])
    expect(res.ready).toBe(1)
    expect(res.flagged).toBe(3)
  })

  it('numbers rows from 1, after blank lines are dropped', () => {
    const res = importSource({ text: '\na\tb\n\nc\td', origin: 'paste' })
    expect(res.rows.map((r) => r.index)).toEqual([1, 2])
  })

  it('trims each side but keeps line breaks inside it', () => {
    expect(pairs('"  term  ","line 1  \nline 2 "', 'csv')).toEqual([['term', 'line 1\nline 2']])
  })

  it('cuts over-long sides to the API limit and flags them', () => {
    const long = 'x'.repeat(MAX_FIELD_LENGTH + 50)
    const res = importSource({ text: `short\t${long}\nfine\tfine`, origin: 'paste' })
    expect(res.rows[0].back).toHaveLength(MAX_FIELD_LENGTH)
    expect(res.rows[0].truncated).toBe(true)
    expect(res.rows[0].issues).toEqual([])
    expect(res.rows[1].truncated).toBe(false)
    expect(res.truncated).toBe(1)
  })

  it('returns nothing for empty text or an empty custom separator', () => {
    expect(importSource({ text: '', origin: 'paste' }).rows).toEqual([])
    expect(parseCards('a|b', { field: 'custom', customField: '', row: 'newline' }).rows).toEqual([])
  })

  it('strips a byte-order mark', () => {
    expect(pairs('﻿a,b', 'csv')).toEqual([['a', 'b']])
  })
})

describe('HTML', () => {
  it('turns breaks into new lines and drops formatting tags', () => {
    expect(stripHtml('<b>Bold</b> and <i>italic</i><br>next<br />line<div>block</div>')).toBe('Bold and italic\nnext\nline\nblock\n')
  })

  it('decodes common, numeric and hex entities', () => {
    expect(stripHtml('a&nbsp;b &amp; c &lt;d&gt; &quot;e&quot; &#39;f&#39; &#x3b1;')).toBe('a b & c <d> "e" \'f\' α')
  })

  it('leaves unknown entities and maths alone', () => {
    expect(stripHtml('a < b &foo; <x>')).toBe('a < b &foo; <x>')
  })

  it('removes images and sound references', () => {
    expect(stripHtml('<img src="cell.jpg">Cell[sound:cell.mp3]')).toBe('Cell')
  })

  it('is detected from the text', () => {
    expect(looksLikeHtml('a<br>b')).toBe(true)
    expect(looksLikeHtml('a&nbsp;b')).toBe(true)
    expect(looksLikeHtml('x < y and y > z')).toBe(false)
  })

  it('is only stripped when the text has HTML in it', () => {
    expect(pairs('x<y\ty>x')).toEqual([['x<y', 'y>x']])
    expect(pairs('a<br>b\tc&amp;d')).toEqual([['a\nb', 'c&d']])
  })
})

describe('Anki plain-text export', () => {
  const anki = [
    '#separator:tab',
    '#html:true',
    'Mitochondria\tThe <b>powerhouse</b> of the cell',
    '"Two<br>lines"\t"has a\ttab"',
    'Ribosome\tMakes proteins&nbsp;',
  ].join('\n')

  it('reads the header', () => {
    expect(readAnkiHeader(anki)).toEqual({ separator: '\t', html: true, skipColumns: [], lineCount: 2 })
    expect(readAnkiHeader('#separator:Pipe\n#tags column:3\na|b|tag').separator).toBe('|')
    expect(readAnkiHeader('a\tb').lineCount).toBe(0)
  })

  it('reads the cards under it', () => {
    expect(pairs(anki, 'txt')).toEqual([
      ['Mitochondria', 'The powerhouse of the cell'],
      ['Two\nlines', 'has a\ttab'],
      ['Ribosome', 'Makes proteins'],
    ])
  })

  it('skips guid, note type, deck and tag columns', () => {
    const text = [
      '#separator:tab',
      '#html:false',
      '#guid column:1',
      '#notetype column:2',
      '#deck column:3',
      '#tags column:6',
      'abc123\tBasic\tBio\tCell\tUnit of life\tch1',
    ].join('\n')
    expect(pairs(text, 'txt')).toEqual([['Cell', 'Unit of life']])
  })

  it('keeps tags as text when the header says html:false', () => {
    expect(pairs('#html:false\na<b>b\tc', 'txt')).toEqual([['a<b>b', 'c']])
  })

  it('follows a comma separator from the header', () => {
    const { separators } = prepareSource({ text: '#separator:comma\na,b', origin: 'txt' })
    expect(separators.field).toBe('comma')
  })

  it('reads a header-less Anki export by detection', () => {
    expect(pairs('front one\tback one\nfront two\tback two', 'txt')).toHaveLength(2)
  })
})

describe('files', () => {
  it('knows the file kinds', () => {
    expect(fileKind('Deck.CSV')).toBe('csv')
    expect(fileKind('deck.tsv')).toBe('tsv')
    expect(fileKind('Biology.txt')).toBe('txt')
    expect(fileKind('Biology.apkg')).toBe('apkg')
    expect(fileKind('notes.docx')).toBe('unsupported')
  })

  it('uses commas for .csv even when a tab appears', () => {
    expect(prepareSource({ text: 'a,b\tc', origin: 'csv' }).separators.field).toBe('comma')
  })
})

describe('saving', () => {
  it('batches cards for /cards/bulk', () => {
    const rows = Array.from({ length: BULK_LIMIT * 2 + 3 }, (_, i) => ({ front: ` q${i} `, back: `a${i}` }))
    const chunks = toBulkChunks(rows)
    expect(chunks.map((c) => c.length)).toEqual([BULK_LIMIT, BULK_LIMIT, 3])
    expect(chunks[0][0]).toEqual({ type: 'flashcard', front: 'q0', back: 'a0' })
  })

  it('chunks evenly', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 2)).toEqual([])
  })
})
