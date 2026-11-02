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
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Give the set a name, like the lecture or topic.'); return }

    setLoading(true)
    setError('')

    try {
      const res = await apiFetch('/sets', {
        method: 'POST',
        body: JSON.stringify({ title, subject, visibility: 'private' }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't create the set. Please try again."))
      const newSet: Set = await res.json()
      router.push(`/sets/${newSet.id}?upload=1`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
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
        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full sm:w-auto sm:self-start">
          Continue to upload
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  )
}
