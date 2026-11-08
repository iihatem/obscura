/**
 * Turns flashcards exported from Quizlet or Anki into question/answer pairs.
 *
 * Quizlet's export is plain text: a tab between term and definition and a new
 * line between cards by default, with comma, semicolon or custom separators as
 * options. Anki's "Notes in Plain Text" export is tab-separated, may start
 * with `#key:value` header lines, quotes fields that hold a tab or newline,
 * and keeps the card's HTML unless the student unticks it.
 *
 * Pure functions only, so every case is easy to test.
 */

/** The API caps each side at this many characters. */
export const MAX_FIELD_LENGTH = 5000
/** The most cards one `/cards/bulk` request accepts. */
export const BULK_LIMIT = 500

export type FieldSeparator = 'tab' | 'dash' | 'comma' | 'custom'
export type RowSeparator = 'newline' | 'semicolon' | 'custom'

export interface Separators {
  field: FieldSeparator
  row: RowSeparator
  /** Used when `field` is 'custom'. */
  customField?: string
  /** Used when `row` is 'custom'. */
  customRow?: string
}

export interface ParseOptions extends Separators {
  /**
   * Honour CSV-style double quotes, so a quoted field can hold the separator
   * or a line break. On for files and for commas; off for pasted Quizlet text,
   * which never quotes and may start a term with a quote mark.
   */
  quotes?: boolean
  /** Strip HTML tags and decode entities. Detected when left out. */
  html?: boolean
}

export type RowIssue = 'no-front' | 'no-back'

export interface ImportRow {
  /** Position in the source, from 1, for pointing the student at the line. */
  index: number
  front: string
  back: string
  issues: RowIssue[]
  /** A side was over MAX_FIELD_LENGTH and has been cut to fit. */
  truncated: boolean
}

export interface ParseResult {
  rows: ImportRow[]
  /** Rows with both sides, ready to save. */
  ready: number
  /** Rows missing a side. */
  flagged: number
  truncated: number
}

const FIELD_STRINGS: Record<Exclude<FieldSeparator, 'custom'>, string> = { tab: '\t', dash: ' - ', comma: ',' }
const ROW_STRINGS: Record<Exclude<RowSeparator, 'custom'>, string> = { newline: '\n', semicolon: ';' }

export function fieldString(s: Separators): string {
  return s.field === 'custom' ? unescapeSeparator(s.customField ?? '') : FIELD_STRINGS[s.field]
}

export function rowString(s: Separators): string {
  return s.row === 'custom' ? unescapeSeparator(s.customRow ?? '') : ROW_STRINGS[s.row]
}

/** Lets a student type `\t` or `\n` for a custom separator. */
function unescapeSeparator(s: string): string {
  return s.replace(/\\t/g, '\t').replace(/\\n/g, '\n')
}

/** Every line ending becomes `\n`, and a leading byte-order mark is dropped. */
export function normalizeNewlines(text: string): string {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Guesses the separators: tab, then " - ", then comma between the sides, and
 * a new line between cards unless the text is one line split by semicolons.
 */
export function detectSeparators(text: string): Separators {
  const body = normalizeNewlines(text).trim()
  const lines = body.split('\n').filter((l) => l.trim() && !l.startsWith('#'))

  // Semicolons inside entities like &amp; don't split cards.
  const parts = body.replace(/&#?[a-z0-9]+;/gi, '').split(';').filter((s) => s.trim())
  const split = parts.filter((p) => /\t| - |,/.test(p)).length
  const row: RowSeparator = lines.length <= 1 && parts.length > 1 && split >= parts.length / 2 ? 'semicolon' : 'newline'
  const records = row === 'semicolon' ? parts : lines

  // A separator counts when it shows up on at least half the cards, so a few
  // stray lines (a title, a blank side) don't throw the guess.
  const share = (sep: string) => records.filter((r) => r.includes(sep)).length / Math.max(records.length, 1)
  let field: FieldSeparator = 'tab'
  if (share('\t') >= 0.5) field = 'tab'
  else if (share(' - ') >= 0.5) field = 'dash'
  else if (share(',') >= 0.5) field = 'comma'
  return { field, row }
}

/** Anki's export header: `#separator:tab`, `#html:true`, `#deck column:2`… */
export interface AnkiHeader {
  separator?: string
  html?: boolean
  /** 0-based columns that hold metadata (guid, note type, deck, tags), not card text. */
  skipColumns: number[]
  /** How many leading lines the header took. */
  lineCount: number
}

const ANKI_SEPARATORS: Record<string, string> = {
  tab: '\t', comma: ',', semicolon: ';', space: ' ', pipe: '|', colon: ':',
}

export function readAnkiHeader(text: string): AnkiHeader {
  const lines = normalizeNewlines(text).split('\n')
  const header: AnkiHeader = { skipColumns: [], lineCount: 0 }
  for (const line of lines) {
    const m = line.match(/^#([a-z ]+):(.*)$/i)
    if (!m) break
    header.lineCount++
    const key = m[1].trim().toLowerCase()
    const value = m[2].trim()
    if (key === 'separator') header.separator = ANKI_SEPARATORS[value.toLowerCase()] ?? value
    else if (key === 'html') header.html = value.toLowerCase() === 'true'
    else if (/^(guid|notetype|deck|tags) column$/.test(key)) {
      const col = parseInt(value, 10)
      if (col >= 1) header.skipColumns.push(col - 1)
    }
  }
  return header
}

/** The separator setting that matches a literal separator string. */
export function separatorFor(literal: string): Pick<Separators, 'field' | 'customField'> {
  const known = (Object.keys(FIELD_STRINGS) as (keyof typeof FIELD_STRINGS)[]).find((k) => FIELD_STRINGS[k] === literal)
  return known ? { field: known } : { field: 'custom', customField: literal === '\t' ? '\\t' : literal }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

const TAG_NAMES = 'br|div|p|b|i|u|s|em|strong|span|font|sup|sub|ul|ol|li|img|hr|code|pre|small|big|mark|strike|a|h[1-6]|table|tr|td|th|tbody|thead'
const TAG = new RegExp(`<\\/?(?:${TAG_NAMES})\\b[^>]*>`, 'gi')
const LOOKS_LIKE_HTML = new RegExp(`<\\/?(?:${TAG_NAMES})\\b[^>]*>|&(?:nbsp|amp|lt|gt|quot|apos|#\\d+|#x[0-9a-f]+);`, 'i')

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function looksLikeHtml(text: string): boolean {
  return LOOKS_LIKE_HTML.test(text)
}

/**
 * Plain text from Anki-style HTML. Line-breaking tags become new lines, other
 * known tags go, and entities are decoded. Only known tag names are touched,
 * so "a < b" or "<x>" in a maths card survives.
 */
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    // A run of block tags (`</div><div>`) is one line break.
    .replace(/(?:\s*<\/?(?:div|p|li|ul|ol|h[1-6]|tr|table|tbody|thead)\b[^>]*>\s*)+/gi, '\n')
    .replace(TAG, '')
    .replace(/\[sound:[^\]]*\]/gi, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
      if (name[0] === '#') {
        const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
      }
      return ENTITIES[name.toLowerCase()] ?? whole
    })
    .replace(/ /g, ' ')
}

// ─── Splitting ────────────────────────────────────────────────────────────────

/**
 * Splits text into records of fields. With `quotes`, a field that starts with
 * `"` runs to the closing quote and may hold either separator; `""` inside it
 * is a literal quote. A quote that doesn't close cleanly is kept as text.
 */
export function splitRecords(text: string, fieldSep: string, rowSep: string, quotes: boolean): string[][] {
  if (!fieldSep || !rowSep) return []
  const records: string[][] = []
  let fields: string[] = []
  let i = 0
  const n = text.length

  while (i <= n) {
    // One field, starting at i.
    let value = ''
    let quoted = false
    if (quotes && text[i] === '"') {
      let j = i + 1
      let buf = ''
      let closed = false
      while (j < n) {
        if (text[j] === '"') {
          if (text[j + 1] === '"') { buf += '"'; j += 2; continue }
          closed = true
          break
        }
        buf += text[j++]
      }
      const after = j + 1
      if (closed && (after === n || text.startsWith(fieldSep, after) || text.startsWith(rowSep, after))) {
        value = buf
        i = after
        quoted = true
      }
    }
    if (!quoted) {
      const nextField = text.indexOf(fieldSep, i)
      const nextRow = text.indexOf(rowSep, i)
      const end = Math.min(nextField === -1 ? n : nextField, nextRow === -1 ? n : nextRow)
      value = text.slice(i, end)
      i = end
    }
    fields.push(value)

    if (i >= n) { records.push(fields); break }
    if (text.startsWith(fieldSep, i) && !(rowSep.startsWith(fieldSep) && text.startsWith(rowSep, i))) {
      i += fieldSep.length
      // A field separator at the very end still ends with an empty field.
      if (i === n) { fields.push(''); records.push(fields); break }
    } else {
      i += rowSep.length
      records.push(fields)
      fields = []
      if (i === n) break
    }
  }
  return records
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/** First rows like "Front,Back" or "Term<tab>Definition" are column names, not a card. */
const HEADER_WORDS = /^(front|back|term|terms|definition|definitions|question|questions|answer|answers|word|meaning)$/i

function isHeaderRow(fields: string[]): boolean {
  return fields.length >= 2 && HEADER_WORDS.test(fields[0].trim()) && HEADER_WORDS.test(fields[1].trim())
}

function cleanField(raw: string, html: boolean): string {
  const text = html ? stripHtml(raw) : raw
  return text
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function clip(s: string): { text: string; cut: boolean } {
  if (s.length <= MAX_FIELD_LENGTH) return { text: s, cut: false }
  return { text: s.slice(0, MAX_FIELD_LENGTH).trimEnd(), cut: true }
}

export function issuesFor(front: string, back: string): RowIssue[] {
  const issues: RowIssue[] = []
  if (!front.trim()) issues.push('no-front')
  if (!back.trim()) issues.push('no-back')
  return issues
}

export function parseCards(text: string, options: ParseOptions & { skipColumns?: number[]; skipLines?: number }): ParseResult {
  let body = normalizeNewlines(text)
  if (options.skipLines) body = body.split('\n').slice(options.skipLines).join('\n')

  const fieldSep = fieldString(options)
  const rowSep = rowString(options)
  const quotes = options.quotes ?? options.field === 'comma'
  const html = options.html ?? looksLikeHtml(body)
  const skip = new Set(options.skipColumns ?? [])

  let records = splitRecords(body, fieldSep, rowSep, quotes)
    .map((fields) => fields.filter((_, col) => !skip.has(col)))
    // Blank lines and whitespace-only records aren't cards.
    .filter((fields) => fields.some((f) => f.trim()))
  if (records.length && isHeaderRow(records[0])) records = records.slice(1)

  const rows = records.map((fields, i): ImportRow => {
    const front = clip(cleanField(fields[0] ?? '', html))
    // " - " also turns up inside answers, so everything after the first one is
    // the answer. Otherwise extra columns (Anki's extra note fields) are left out.
    const rawBack = options.field === 'dash' ? fields.slice(1).join(fieldSep) : fields[1] ?? ''
    const back = clip(cleanField(rawBack, html))
    return {
      index: i + 1,
      front: front.text,
      back: back.text,
      issues: issuesFor(front.text, back.text),
      truncated: front.cut || back.cut,
    }
  })

  return summarize(rows)
}

export function summarize(rows: ImportRow[]): ParseResult {
  return {
    rows,
    ready: rows.filter((r) => r.issues.length === 0).length,
    flagged: rows.filter((r) => r.issues.length > 0).length,
    truncated: rows.filter((r) => r.truncated).length,
  }
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export type FileKind = 'csv' | 'tsv' | 'txt' | 'apkg' | 'unsupported'

export function fileKind(name: string): FileKind {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'csv') return 'csv'
  if (ext === 'tsv' || ext === 'tab') return 'tsv'
  if (ext === 'txt') return 'txt'
  if (ext === 'apkg' || ext === 'colpkg') return 'apkg'
  return 'unsupported'
}

export interface Source {
  text: string
  /** Where it came from; files get quote handling and their header read. */
  origin: 'paste' | 'csv' | 'tsv' | 'txt'
}

export interface Prepared {
  /** Separators to show as the starting choice. */
  separators: Separators
  /** Extra options that come from the file itself, not the student. */
  fixed: Pick<ParseOptions, 'html' | 'quotes'> & { skipColumns: number[]; skipLines: number }
}

/** Works out how to read a source before the student changes anything. */
export function prepareSource({ text, origin }: Source): Prepared {
  const header = readAnkiHeader(text)
  const fixed: Prepared['fixed'] = {
    quotes: origin !== 'paste' || header.lineCount > 0 ? true : undefined,
    html: header.html,
    skipColumns: header.skipColumns,
    skipLines: header.lineCount,
  }
  const detected = detectSeparators(text)
  let separators: Separators = detected
  if (header.separator) separators = { ...detected, ...separatorFor(header.separator), row: 'newline' }
  else if (origin === 'csv') separators = { field: 'comma', row: 'newline' }
  else if (origin === 'tsv') separators = { field: 'tab', row: 'newline' }
  return { separators, fixed }
}

/** Cards ready for `/cards/bulk`, in batches it accepts. */
export function toBulkChunks(rows: { front: string; back: string }[], size = BULK_LIMIT) {
  const cards = rows.map((r) => ({ type: 'flashcard' as const, front: r.front.trim(), back: r.back.trim() }))
  return chunk(cards, size)
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
