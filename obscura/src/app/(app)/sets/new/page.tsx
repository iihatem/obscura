'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Set } from '@/types'

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
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, subject, visibility }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Failed to create set')
      }
      const newSet: Set = await res.json()
      router.push(`/sets/${newSet.id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="p-8 lg:p-12 max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/library"
          className="text-xs font-medium text-[#45474d] hover:text-[#051125] transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Library
        </Link>
        <div className="mt-4 space-y-1">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#006972]">Curate Knowledge</span>
          <h1 className="text-3xl font-extrabold text-[#051125] tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
            New Set
          </h1>
          <p className="text-sm text-[#45474d]">Give your set a name and a few details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl p-8 border border-[#e7e8e9] shadow-sm relative overflow-hidden flex flex-col gap-6">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#051125] via-[#006972] to-[#051125]" />

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neuroanatomy — Week 4"
              required
              autoFocus
              className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-2">
              Description <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will students learn from this set?"
              className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-2">
              Subject <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Anatomy, Physiology, Biochemistry"
              className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-3">
              Visibility
            </label>
            <div className="flex flex-col gap-2">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                    visibility === opt.value
                      ? 'border-[#006972]/40 bg-[#006972]/5'
                      : 'border-[#e7e8e9] hover:border-[#006972]/20'
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="mt-0.5 accent-[#006972]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#051125]">{opt.label}</p>
                    <p className="text-xs text-[#45474d]">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] rounded-lg px-4 py-2">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/library')}
              className="px-4 py-2 text-sm font-bold text-[#45474d] border border-[#e7e8e9] rounded-lg hover:bg-[#edeeef] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 scholar-gradient text-white text-sm font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">add</span>
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
