'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, Globe, Link2, Lock, Pencil, Play, Share2, Star } from 'lucide-react'
import type { Set } from '@/types'
import Button, { buttonClass } from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import IconButton from '@/components/ui/IconButton'
import { cn } from '@/lib/utils'
import { apiFetch, errorMessage } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

type Visibility = Set['visibility']

const VISIBILITY: { value: Visibility; label: string; detail: string; icon: typeof Lock }[] = [
  { value: 'private', label: 'Private', detail: 'Only you can see it.', icon: Lock },
  { value: 'link', label: 'Anyone with the link', detail: "Classmates you send it to can study and copy it. It won't show up in Explore.", icon: Link2 },
  { value: 'public', label: 'Public', detail: 'Listed in Explore, so any student can find, study and copy it.', icon: Globe },
]

interface SetHeaderProps {
  set: Set
  flashcardCount: number
  diagramCount: number
  isOwner: boolean
  onUpdate: (updated: Set) => void
}

export default function SetHeader({ set, flashcardCount, diagramCount, isOwner, onUpdate }: SetHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const cardCount = flashcardCount + diagramCount
  const vis = VISIBILITY.find((v) => v.value === set.visibility) ?? VISIBILITY[0]

  // ── Edit ──
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState(set.title)
  const [description, setDescription] = useState(set.description ?? '')
  const [subject, setSubject] = useState(set.subject ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Share ──
  const [shareOpen, setShareOpen] = useState(false)
  const [changingVis, setChangingVis] = useState<Visibility | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window is only known after mount
    setOrigin(window.location.origin)
  }, [])
  const shareUrl = set.share_token && origin ? `${origin}/s/${set.share_token}` : ''

  // ── Star ──
  const [starred, setStarred] = useState(false)
  const [starCount, setStarCount] = useState(set.star_count ?? 0)

  useEffect(() => {
    if (isOwner) return
    apiFetch(`/sets/${set.id}/star`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setStarred(data.starred)
        setStarCount(data.count)
      })
      .catch(() => {})
  }, [set.id, isOwner])

  async function handleStarToggle() {
    const wasStarred = starred
    setStarred(!wasStarred)
    setStarCount((c) => c + (wasStarred ? -1 : 1))
    try {
      const res = await apiFetch(`/sets/${set.id}/star`, { method: 'POST' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't update the star."))
      const data = await res.json()
      setStarred(data.starred)
      setStarCount(data.count)
    } catch (err) {
      setStarred(wasStarred)
      setStarCount((c) => c + (wasStarred ? 1 : -1))
      toast(err instanceof Error ? err.message : "Couldn't update the star.", 'error')
    }
  }

  function openEdit() {
    setTitle(set.title)
    setDescription(set.description ?? '')
    setSubject(set.subject ?? '')
    setError('')
    setEditOpen(true)
  }

  async function patch(body: Partial<Pick<Set, 'title' | 'description' | 'subject' | 'visibility'>>) {
    const res = await apiFetch(`/sets/${set.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    if (!res.ok) throw new Error(await errorMessage(res, "Couldn't save the set. Please try again."))
    const updated: Set = await res.json()
    onUpdate(updated)
    return updated
  }

  async function handleSave() {
    if (!title.trim()) { setError('Give the set a title.'); return }
    setSaving(true)
    setError('')
    try {
      await patch({ title, description, subject })
      setEditOpen(false)
      toast('Saved')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function changeVisibility(v: Visibility) {
    if (v === set.visibility) return
    setChangingVis(v)
    try {
      await patch({ visibility: v })
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setChangingVis(null)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the link is selectable in the field instead.
      document.getElementById('share-link')?.focus()
      toast('Copy the link from the box above.', 'info')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await apiFetch(`/sets/${set.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't delete the set. Please try again."))
      router.push('/library')
      router.refresh()
    } catch (err) {
      toast((err as Error).message, 'error')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const counts = [
    flashcardCount ? `${flashcardCount} flashcard${flashcardCount === 1 ? '' : 's'}` : null,
    diagramCount ? `${diagramCount} diagram${diagramCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ') || 'No cards yet'

  return (
    <>
      <header className="flex flex-col gap-5 py-4 sm:py-6">
        <Link href={isOwner ? '/library' : '/explore'} className="flex w-fit items-center gap-1.5 rounded-full py-1 text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {isOwner ? 'Library' : 'Explore'}
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            {set.subject && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{set.subject}</p>}
            <h1 className="text-[28px] font-extrabold leading-tight text-ink sm:text-4xl">{set.title}</h1>
            {set.description && <p className="mt-2 max-w-2xl text-ink-muted">{set.description}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span>{counts}</span>
              {isOwner && (
                <span className="inline-flex items-center gap-1">
                  <vis.icon className="h-3.5 w-3.5" aria-hidden />
                  {vis.label}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cardCount > 0 ? (
              <Link href={`/sets/${set.id}/study`} className={cn(buttonClass('primary', 'lg'), 'flex-1 sm:flex-none')}>
                <Play className="h-4 w-4" aria-hidden />
                Study
              </Link>
            ) : (
              <span className={cn(buttonClass('primary', 'lg'), 'pointer-events-none flex-1 opacity-40 sm:flex-none')} aria-disabled title="Add cards to study this set">
                <Play className="h-4 w-4" aria-hidden />
                Study
              </span>
            )}
            {isOwner ? (
              <>
                <Button variant="secondary" size="lg" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4" aria-hidden />
                  Share
                </Button>
                <IconButton label="Edit set details" variant="outline" className="h-12 w-12" onClick={openEdit}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </IconButton>
              </>
            ) : (
              <Button variant="secondary" size="lg" aria-pressed={starred} onClick={handleStarToggle}>
                <Star className={cn('h-4 w-4', starred && 'fill-current text-warn')} aria-hidden />
                {starred ? 'Starred' : 'Star'}
                <span className="tabular-nums text-ink-muted">{starCount}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Share */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share this set" className="sm:max-w-lg">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Who can see this set">
          {VISIBILITY.map((v) => {
            const selected = set.visibility === v.value
            return (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={changingVis !== null}
                onClick={() => changeVisibility(v.value)}
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                  selected ? 'border-accent bg-accent-soft/50' : 'border-line hover:border-ink-muted/50'
                )}
              >
                <v.icon className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-accent-ink' : 'text-ink-muted')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{v.label}</span>
                  <span className="block text-sm text-ink-muted">{v.detail}</span>
                </span>
                {changingVis === v.value ? (
                  <span className="mt-1 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
                ) : selected ? (
                  <Check className="mt-0.5 h-5 w-5 text-accent-ink" aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>
        {set.visibility !== 'private' && shareUrl && (
          <div className="mt-5 flex gap-2">
            <input id="share-link" readOnly value={shareUrl} onFocus={(e) => e.target.select()} aria-label="Share link"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-accent focus:outline-none" />
            <Button onClick={copyLink} className="h-11">
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit set details" className="sm:max-w-lg">
        <div className="flex flex-col gap-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          <Input label="Subject or course" maxLength={100} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. BIO 110" />
          <Textarea label="Description" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this set about?" />
          {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{error}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => { setEditOpen(false); setDeleteOpen(true) }} className="text-sm font-medium text-bad hover:underline">
              Delete set
            </button>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button loading={saving} className="flex-1 sm:flex-none" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this set?" description={`“${set.title}” and its ${cardCount} cards will be gone for good. This can't be undone.`}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Keep it</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete set</Button>
        </div>
      </Modal>
    </>
  )
}
