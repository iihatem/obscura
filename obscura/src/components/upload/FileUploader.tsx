'use client'

import { useCallback, useRef, useState } from 'react'
import { apiFetch, withColdStartRetry } from '@/lib/api'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

export interface PageData {
  dataUrl: string
  pageIndex: number
  /** Embedded PDF text, when PyMuPDF can extract a useful text layer. */
  extractedText?: string
}

interface FileUploaderProps {
  onPagesReady: (pages: PageData[]) => void
}

/** Matches the API's limit; checked here so a huge file fails before uploading. */
const MAX_FILE_BYTES = 50 * 1024 * 1024

const UploadIcon = () => (
  <Icon name="cloud_upload" size={48} className="text-accent" />
)

export default function FileUploader({ onPagesReady }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is over 50 MB. Split the PDF or export fewer pages, then try again.')
      return
    }
    setIsProcessing(true)
    setProgress(null)

    try {
      if (file.type === 'application/pdf') {
        await processPdf(file)
      } else if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        processImage(file)
      } else {
        setError('Unsupported file type. Please upload a PDF, JPG, PNG, or WebP file.')
        setIsProcessing(false)
      }
    } catch (err) {
      setError((err as Error).message ?? 'Failed to process file')
      setIsProcessing(false)
    }
  }, [onPagesReady]) // eslint-disable-line react-hooks/exhaustive-deps

  function processImage(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setIsProcessing(false)
      onPagesReady([{ dataUrl, pageIndex: 0 }])
    }
    reader.readAsDataURL(file)
  }

  async function processPdf(file: File) {
    setProgress('Uploading and rendering pages… large PDFs can take a minute.')

    const form = new FormData()
    form.append('file', file)

    const res = await withColdStartRetry(
      () => apiFetch('/upload/pdf', { method: 'POST', body: form }),
      () => setProgress('The study server is waking up — this takes a few seconds on first use…')
    )

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail ?? 'PDF rendering failed')
    }

    const { pages } = await res.json() as { pages: PageData[] }

    setIsProcessing(false)
    setProgress(null)
    onPagesReady(pages)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-accent/5 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-label="Upload a PDF or image"
        aria-busy={isProcessing}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-all cursor-pointer text-center',
          isDragging
            ? 'border-accent/50 bg-accent/5'
            : 'border-line/50 hover:border-accent/50',
          isProcessing && 'pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-paper-2 border-t-accent" />
            <p className="font-headline text-sm font-bold text-ink">
              {progress ?? 'Processing…'}
            </p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-paper rounded-full flex items-center justify-center mb-2">
              <UploadIcon />
            </div>
            <div>
              <h3 className="font-headline text-2xl font-bold text-ink mb-2">
                Upload a PDF or image
              </h3>
              <p className="text-ink-muted max-w-sm mb-6 leading-relaxed text-sm">
                Drop in lecture slides, notes or a diagram. You&apos;ll pick which pages to turn into flashcards and diagram quizzes.
              </p>
              <span className="inline-block px-8 py-3 bg-ink text-on-ink rounded-lg font-bold text-sm shadow-xl shadow-ink/10 hover:scale-[1.02] active:scale-95 transition-all">
                Choose file
              </span>
              <p className="mt-4 text-[11px] text-ink-muted tracking-wider uppercase font-bold">
                PDF, JPG, PNG or WebP (Max 50MB)
              </p>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="absolute bottom-3 px-4 text-xs text-bad">{error}</p>
        )}
      </div>
    </div>
  )
}
