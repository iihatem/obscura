export type Grade = 'correct' | 'close' | 'wrong' | 'empty'

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
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

export function gradeAnswer(input: string, correct: string): Grade {
  if (input.trim() === '') return 'empty'

  const normInput = normalize(input)
  const normCorrect = normalize(correct)

  const dist = levenshtein(normInput, normCorrect)

  if (dist <= 1) return 'correct'

  const closeThreshold = Math.max(2, Math.floor(normCorrect.length * 0.3))
  if (dist <= closeThreshold) return 'close'

  return 'wrong'
}
