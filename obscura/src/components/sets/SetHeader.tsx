'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Set } from '@/types'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

const visibilityOptions = [
  { value: 'private', label: 'Private' },
  { value: 'link', label: 'Link only' },
  { value: 'public', label: 'Public' },
] as const

interface SetHeaderProps {
  set: Set
  cardCount: number
  isOwner: boolean
  onUpdate: (updated: Set) => void
}

export default function SetHeader({ set, cardCount, isOwner, onUpdate }: SetHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState(set.title)
  const [description, setDescription] = useState(set.description ?? '')
  const [subject, setSubject] = useState(set.subject ?? '')
  const [visibility, setVisibility] = useState<Set['visibility']>(set.visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openEdit() {
    setTitle(set.title)
    setDescription(set.description ?? '')
    setSubject(set.subject ?? '')
    setVisibility(set.visibility)
    setError('')
    setEditOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/sets/${set.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, subject, visibility }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error) }
      const updated: Set = await res.json()
      onUpdate(updated)
      setEditOpen(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/sets/${set.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/library')
      router.refresh()
    } catch {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const visLabel = { private: 'Private', link: 'Link only', public: 'Public' }[set.visibility]
  const visVariant = { private: 'default', link: 'blue', public: 'green' }[set.visibility] as 'default' | 'blue' | 'green'

  return (
    <>
      <div className="bg-[#f8f9fa]/80 backdrop-blur-md border-b border-[#c5c6cd]/20 px-6 py-5 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {set.subject && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#006972]">
                  {set.subject}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#75777d]">
                {visLabel}
              </span>
              <span className="text-xs text-[#45474d]">{cardCount} cards</span>
            </div>
            <h1
              className="text-2xl font-extrabold text-[#051125] truncate tracking-tight"
              style={{ fontFamily: 'var(--font-manrope)' }}
            >
              {set.title}
            </h1>
            {set.description && (
              <p className="mt-1 text-sm text-[#45474d] line-clamp-2">{set.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <button
                onClick={openEdit}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e7e8e9] bg-white px-3 text-xs font-bold text-[#051125] hover:bg-[#edeeef] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit
              </button>
            )}
            <Link
              href={`/sets/${set.id}/study`}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-all',
                cardCount === 0
                  ? 'pointer-events-none bg-[#edeeef] text-[#45474d]'
                  : 'scholar-gradient text-white hover:opacity-90 shadow-lg shadow-[#051125]/20'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              Study
            </Link>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit set"
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4 mt-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[#45474d]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-[#f3f4f5] border-none px-3 py-2 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 resize-none"
              placeholder="What is this set about?"
            />
          </div>
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Anatomy, Physiology"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[#45474d]">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {visibilityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-bold transition-colors',
                    visibility === opt.value
                      ? 'border-[#051125] bg-[#051125] text-white'
                      : 'border-[#e7e8e9] text-[#45474d] hover:border-[#006972]/40'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] rounded-lg px-4 py-2">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="text-xs text-[#45474d] hover:text-[#ba1a1a] transition-colors"
              >
                Delete set
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">Are you sure?</span>
                <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
