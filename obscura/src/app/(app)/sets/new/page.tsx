'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { apiFetch, errorMessage } from '@/lib/api'
import type { Set } from '@/types'
import Icon from '@/components/ui/Icon'

const visibilityOptions = [
  { value: 'private', label: 'Private', desc: 'Only you can see this set' },
  { value: 'link', label: 'Link only', desc: 'Anyone with the link can view' },
  { value: 'public', label: 'Public', desc: 'Listed in Explore for everyone' },
] as const

export default function NewSetPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [visibility, setVisibility] = useState<Set['visibility']>('private')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }

    setLoading(true)
    setError('')

    try {
      const res = await apiFetch('/sets', {
        method: 'POST',
        body: JSON.stringify({ title, description, subject, visibility }),
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
    <div className="mx-auto max-w-xl py-4 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/library"
          className="text-xs font-medium text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
        >
          <Icon name="arrow_back" size={16} />
          Library
        </Link>
        <div className="mt-4 space-y-1">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-accent">Curate Knowledge</span>
          <h1 className="font-headline text-3xl font-extrabold text-ink tracking-tight">
            New Set
          </h1>
          <p className="text-sm text-ink-muted">Give your set a name and a few details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-surface rounded-xl p-8 border border-line shadow-sm relative overflow-hidden flex flex-col gap-6">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink via-accent to-ink" />

          <div>
            <label htmlFor="set-title" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
              Title *
            </label>
            <input
              id="set-title"
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neuroanatomy — Week 4"
              required
              autoFocus
              className="w-full bg-paper border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="set-description" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
              Description <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="set-description"
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will students learn from this set?"
              className="w-full bg-paper border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="set-subject" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
              Subject <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="set-subject"
              type="text"
              maxLength={100}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Anatomy, Physiology, Biochemistry"
              className="w-full bg-paper border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">
              Visibility
            </label>
            <div className="flex flex-col gap-2">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                    visibility === opt.value
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-line hover:border-accent/20'
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink">{opt.label}</p>
                    <p className="text-xs text-ink-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-bad bg-bad-soft rounded-lg px-4 py-2">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/library')}
              className="px-4 py-2 text-sm font-bold text-ink-muted border border-line rounded-lg hover:bg-paper-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-ink text-on-ink text-sm font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-white" />
                  Creating…
                </>
              ) : (
                <>
                  <Icon name="add" size={16} />
                  Create set
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
