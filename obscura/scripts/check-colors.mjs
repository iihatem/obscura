#!/usr/bin/env node
// Fails when src/ uses colors outside the Quiet Paper tokens: arbitrary hex
// classes, Tailwind palette classes, bg-white/text-black and friends, or the
// retired Material Symbols icon font. Token definitions live in globals.css,
// which is the one file allowed to hold raw colors.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const PALETTES = 'stone|gray|slate|zinc|neutral|red|green|emerald|amber|yellow|violet|purple|blue|sky|teal|cyan|indigo|rose|orange|lime|pink|fuchsia'
const UTILITIES = 'bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|decoration|shadow|accent|caret'

export const RULES = [
  { name: 'hex color class', re: /\[#[0-9a-fA-F]{3,8}\]/g },
  { name: 'palette class', re: new RegExp(`\\b(?:${UTILITIES})-(?:${PALETTES})-\\d{2,3}\\b`, 'g') },
  { name: 'white/black class', re: new RegExp(`\\b(?:${UTILITIES})-(?:white|black)\\b`, 'g') },
  { name: 'Material Symbols', re: /material-symbols/g },
]

export function findViolations(text) {
  const found = []
  text.split('\n').forEach((line, i) => {
    for (const { name, re } of RULES) {
      for (const m of line.matchAll(re)) found.push({ line: i + 1, rule: name, match: m[0] })
    }
  })
  return found
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('..', import.meta.url).pathname
  let total = 0
  for (const file of walk(join(root, 'src'))) {
    if (file.endsWith('globals.css')) continue
    for (const v of findViolations(readFileSync(file, 'utf8'))) {
      console.log(`${relative(root, file)}:${v.line}  ${v.rule}: ${v.match}`)
      total++
    }
  }
  if (total) {
    console.error(`\n${total} color${total === 1 ? '' : 's'} outside the design tokens. Use bg-paper, text-ink, border-line and the other tokens in globals.css.`)
    process.exit(1)
  }
  console.log('check:colors: all colors come from the design tokens')
}
