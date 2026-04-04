'use client'

import { useCallback, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface PageData {
  dataUrl: string
  pageIndex: number
}

interface FileUploaderProps {
  onPagesReady: (pages: PageData[]) => void
}

const UploadIcon = () => (
  <span className="material-symbols-outlined text-[#006972] text-5xl" style={{ fontVariationSettings: "'wght' 200" }}>
    cloud_upload
  </span>
)

export default function FileUploader({ onPagesReady }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
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
    setProgress('Uploading PDF…')

    const form = new FormData()
    form.append('file', file)

    const res = await apiFetch('/upload/pdf', { method: 'POST', body: form })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail ?? 'PDF rendering failed')
    }

    setProgress('Rendering pages…')
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
      <div className="absolute -inset-1 bg-[#006972]/5 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-all cursor-pointer text-center',
          isDragging
            ? 'border-[#006972]/50 bg-[#006972]/5'
            : 'border-[#c5c6cd]/50 hover:border-[#006972]/50',
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
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#edeeef] border-t-[#006972]" />
            <p className="text-sm font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
              {progress ?? 'Processing…'}
            </p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-[#f3f4f5] rounded-full flex items-center justify-center mb-2">
              <UploadIcon />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#051125] mb-2" style={{ fontFamily: 'var(--font-manrope)' }}>
                Begin Curation
              </h3>
              <p className="text-[#45474d] max-w-sm mb-6 leading-relaxed text-sm">
                Drop your lecture notes, PDFs, or slide decks here. Our AI will extract concepts, diagrams, and logic flows.
              </p>
              <button className="px-8 py-3 scholar-gradient text-white rounded-lg font-bold text-sm shadow-xl shadow-[#051125]/10 hover:scale-[1.02] active:scale-95 transition-all pointer-events-none">
                Select Files
              </button>
              <p className="mt-4 text-[11px] text-[#75777d] tracking-wider uppercase font-bold">
                PDF, JPG, PNG or WebP (Max 50MB)
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="absolute bottom-3 text-xs text-[#ba1a1a]">{error}</p>
        )}
      </div>
    </div>
  )
}
