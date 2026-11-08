export type Grade = 'correct' | 'close' | 'wrong' | 'empty'

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in'])

/** Lowercase letters, digits and single spaces, without a leading article. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '')
}

function words(s: string): string[] {
  return s.split(' ').filter((w) => w && !STOPWORDS.has(w))
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/** Two words match when they differ by about one letter in four. */
function sameWord(a: string, b: string): boolean {
  return levenshtein(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) * 0.25))
}

/**
 * Every word typed is in the answer, in any order. Used to give a sentence
 * answer partial credit when the student names part of it ("surgical" for
 * "Surgical intervention"), which gradeAnswer alone calls wrong.
 */
export function namesPartOf(input: string, correct: string): boolean {
  const typed = words(normalize(input))
  const wanted = words(normalize(correct))
  if (!typed.length) return false
  const matched = new Set<number>()
  for (const w of typed) {
    const hit = wanted.findIndex((x, i) => !matched.has(i) && sameWord(w, x))
    if (hit === -1) return false
    matched.add(hit)
  }
  return true
}

/**
 * How well a typed answer names a label.
 *
 * The whole answer is compared first, forgiving small slips. Failing that, an
 * answer that names most of a longer label ("bone marrow" for "Red bone
 * marrow") is Almost — but every word typed has to be in the label, so a list
 * of guesses never earns credit.
 */
export function gradeAnswer(input: string, correct: string): Grade {
  if (input.trim() === '') return 'empty'

  const answer = normalize(input)
  const label = normalize(correct)
  if (!answer) return 'wrong'

  const dist = levenshtein(answer, label)
  if (dist <= 1) return 'correct'
  if (dist <= Math.max(2, Math.floor(label.length * 0.3))) return 'close'

  const typed = words(answer)
  const wanted = words(label)
  if (!typed.length || wanted.length < 2) return 'wrong'
  const matched = new Set<number>()
  for (const w of typed) {
    const hit = wanted.findIndex((x, i) => !matched.has(i) && sameWord(w, x))
    if (hit === -1) return 'wrong'
    matched.add(hit)
  }
  return matched.size / wanted.length >= 0.5 && matched.size >= 2 ? 'close' : 'wrong'
}
