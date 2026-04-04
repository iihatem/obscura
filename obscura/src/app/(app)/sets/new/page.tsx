'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { Set } from '@/types'

const visibilityOptions = [
  {
    value: 'private',
    label: 'Private',
    desc: 'Only you can see this set',
  },
  {
    value: 'link',
    label: 'Link only',
    desc: 'Anyone with the link can view',
  },
  {
    value: 'public',
    label: 'Public',
    desc: 'Listed in Explore for everyone',
  },
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
    <div className="p-6 lg:p-8 max-w-xl">
      <div className="mb-6">
        <Link
          href="/library"
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          ← Library
        </Link>
        <h1 className="text-xl font-semibold text-stone-900 mt-2">New set</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Give your set a name and a few details.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg" className="flex flex-col gap-5">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Neuroanatomy — Week 4"
            required
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">
              Description <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will students learn from this set?"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>

          <Input
            label="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Anatomy, Physiology, Biochemistry"
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-stone-700">Visibility</label>
            <div className="flex flex-col gap-2">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    visibility === opt.value
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="mt-0.5 accent-stone-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                    <p className="text-xs text-stone-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/library')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create set
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
