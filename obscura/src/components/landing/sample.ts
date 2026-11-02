import type { TrialResult } from '@/lib/trial'
import { CELL_LABELS } from './CellDiagram'

/** A real-shaped result for the sample lecture, shown instantly with no upload. */
export const SAMPLE_FILE = 'BIO 110 · Lecture 4 · Cell structure'

export const SAMPLE_RESULTS: TrialResult[] = [
  {
    pageIndex: 1, type: 'flashcard', cards: [
      { front: 'What makes the cell membrane selectively permeable?', back: 'Its phospholipid bilayer, plus channel and carrier proteins.' },
      { front: 'Which part of a phospholipid faces the watery inside and outside of the cell?', back: 'The hydrophilic phosphate heads.' },
    ],
  },
  {
    pageIndex: 2, type: 'flashcard', cards: [
      { front: 'What are the folds of the inner mitochondrial membrane called?', back: 'Cristae.' },
      { front: 'Why does the inner mitochondrial membrane fold?', back: 'To increase surface area for the electron transport chain.' },
      { front: 'What does ATP synthase use to make ATP?', back: 'The proton gradient across the inner membrane.' },
    ],
  },
  {
    pageIndex: 3, type: 'flashcard', cards: [
      { front: 'Which organelle modifies and packages proteins for secretion?', back: 'The Golgi apparatus.' },
    ],
  },
  {
    pageIndex: 4, type: 'diagram',
    labels: CELL_LABELS.map(({ label, x, y, width, height }) => ({ label, x, y, width, height })),
  },
]
