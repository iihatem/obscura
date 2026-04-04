'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import type { PageData } from './FileUploader'

export type PageType = 'diagram' | 'flashcard'

export interface SelectedPage {
  pageData: PageData
  type: PageType
}

interface PagePickerProps {
  pages: PageData[]
  onGenerate: (selectedPages: SelectedPage[]) => void
}

/** Very simple heuristic: sample a few pixels; if >15% are non-white → diagram */
async function detectPageType(dataUrl: string): Promise<PageType> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 0.1
      canvas.width = Math.max(1, Math.floor(img.width * scale))
      canvas.height = Math.max(1, Math.floor(img.height * scale))
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let nonWhite = 0
      const total = canvas.width * canvas.height
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        if (r < 240 || g < 240 || b < 240) nonWhite++
      }
      resolve(nonWhite / total > 0.15 ? 'diagram' : 'flashcard')
    }
    img.onerror = () => resolve('flashcard')
    img.src = dataUrl
  })
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function PagePicker({ pages, onGenerate }: PagePickerProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(pages.map((p) => p.pageIndex)))
  const [types, setTypes] = useState<Record<number, PageType>>({})
  const [detecting, setDetecting] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function detect() {
      setDetecting(true)
      const results: Record<number, PageType> = {}
      for (const page of pages) {
        if (cancelled) return
        results[page.pageIndex] = await detectPageType(page.dataUrl)
      }
      if (!cancelled) {
        setTypes(results)
        setDetecting(false)
      }
    }
    detect()
    return () => { cancelled = true }
  }, [pages])

  function togglePage(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function setType(idx: number, type: PageType) {
    setTypes((prev) => ({ ...prev, [idx]: type }))
  }

  function selectAll() {
    setSelected(new Set(pages.map((p) => p.pageIndex)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  function handleGenerate() {
    const selectedPages: SelectedPage[] = pages
      .filter((p) => selected.has(p.pageIndex))
      .map((p) => ({
        pageData: p,
        type: types[p.pageIndex] ?? 'flashcard',
      }))
    onGenerate(selectedPages)
  }

  const selectedCount = selected.size

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
          >
            Select all
          </button>
          <span className="text-stone-300">·</span>
          <button
            onClick={deselectAll}
            className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
          >
            Deselect all
          </button>
        </div>
        <span className="text-xs text-stone-500">
          {selectedCount} of {pages.length} selected
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pages.map((page) => {
          const isSelected = selected.has(page.pageIndex)
          const type = types[page.pageIndex]

          return (
            <div
              key={page.pageIndex}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-lg border-2 cursor-pointer transition-all',
                isSelected ? 'border-stone-900 shadow-sm' : 'border-stone-200 hover:border-stone-300'
              )}
            >
              {/* Thumbnail */}
              <div
                className="relative aspect-[3/4] bg-stone-100"
                onClick={() => togglePage(page.pageIndex)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.dataUrl}
                  alt={`Page ${page.pageIndex + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Selection overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-stone-900/10" />
                )}

                {/* Checkmark */}
                <div
                  className={cn(
                    'absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                    isSelected
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-white/80 bg-white/60 text-transparent group-hover:border-stone-300'
                  )}
                >
                  <CheckIcon />
                </div>

                {/* Page number */}
                <div className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium bg-black/40 text-white">
                  {page.pageIndex + 1}
                </div>
              </div>

              {/* Type selector */}
              <div className="flex border-t border-stone-100 bg-white">
                {detecting && !type ? (
                  <div className="flex w-full items-center justify-center py-1.5">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setType(page.pageIndex, 'flashcard')}
                      className={cn(
                        'flex-1 py-1.5 text-[11px] font-medium transition-colors',
                        type === 'flashcard'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-stone-400 hover:text-stone-600'
                      )}
                    >
                      Text
                    </button>
                    <div className="w-px bg-stone-100" />
                    <button
                      onClick={() => setType(page.pageIndex, 'diagram')}
                      className={cn(
                        'flex-1 py-1.5 text-[11px] font-medium transition-colors',
                        type === 'diagram'
                          ? 'bg-violet-50 text-violet-700'
                          : 'text-stone-400 hover:text-stone-600'
                      )}
                    >
                      Diagram
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Generate button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleGenerate}
          disabled={selectedCount === 0}
          size="lg"
        >
          Generate cards from {selectedCount} page{selectedCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}
