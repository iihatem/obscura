'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { apiFetch, errorMessage } from '@/lib/api'
import type { Set } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

/**
 * Only the name is needed to start. Visibility defaults to private and can be
 * changed from Share later, so the next screen is straight into the upload.
 */
export default function NewSetPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')
  // Which way in the student picked: upload a lecture, or import existing cards.
  const [loading, setLoading] = useState<'upload' | 'import' | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create('upload')
  }

  async function create(next: 'upload' | 'import') {
    if (!title.trim()) { setError('Give the set a name, like the lecture or topic.'); return }

    setLoading(next)
    setError('')

    try {
      const res = await apiFetch('/sets', {
        method: 'POST',
        body: JSON.stringify({ title, subject, visibility: 'private' }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't create the set. Please try again."))
      const newSet: Set = await res.json()
      router.push(`/sets/${newSet.id}?${next}=1`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-4 sm:py-8">
      <Link href="/library" className="flex w-fit items-center gap-1.5 rounded-full py-1 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Library
      </Link>
      <h1 className="mt-6 text-[28px] font-extrabold text-ink">New study set</h1>
      <p className="mt-1 text-ink-muted">Name it after the lecture or topic. You&apos;ll add the slides next.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <Input
          label="Name"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lecture 4: Cell structure"
          error={error || undefined}
          autoFocus
        />
        <Input
          label="Course or subject"
          hint="Optional. Helps you find it later."
          maxLength={100}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. BIO 110"
        />
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <Button type="submit" size="lg" loading={loading === 'upload'} disabled={loading !== null} className="w-full sm:w-auto">
            Continue to upload
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <button
            type="button"
            onClick={() => create('import')}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink hover:underline disabled:opacity-50"
          >
            {loading === 'import' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            or import cards from Quizlet or Anki
          </button>
        </div>
      </form>
    </div>
  )
}
