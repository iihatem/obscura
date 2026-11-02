'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, EllipsisVertical, Globe, Link2, Lock, Play, Trash2 } from 'lucide-react'
import type { Set } from '@/types'
import { cn, plural, proxyImageUrl } from '@/lib/utils'
import { apiFetch, errorMessage } from '@/lib/api'
import { relativeDate } from '@/lib/library'
import { useToast } from '@/components/ui/Toast'
import Menu, { MenuItem } from '@/components/ui/Menu'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export interface LibrarySet extends Set {
  lastStudiedAt?: string | null
  lastScore?: number | null
}

const visibility = {
  private: { icon: Lock, label: 'Private' },
  link: { icon: Link2, label: 'Anyone with the link' },
  public: { icon: Globe, label: 'Public' },
} as const

export default function SetCard({ set, hasDraft = false }: { set: LibrarySet; hasDraft?: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const vis = visibility[set.visibility] ?? visibility.private

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await apiFetch(`/sets/${set.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't delete the set. Please try again."))
      toast(`Deleted “${set.title}”`)
      setConfirming(false)
      router.refresh()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-ink-muted/40 hover:shadow-lift">
      <Link href={`/sets/${set.id}`} className="flex flex-1 flex-col gap-3 p-5">
        {set.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxyImageUrl(set.thumbnail_url)} alt="" className="-mx-5 -mt-5 mb-1 h-32 w-[calc(100%+2.5rem)] max-w-none border-b border-line bg-paper-2 object-cover" />
        )}
        <div className="flex min-h-5 items-center gap-2 pr-8">
          {set.subject && <span className="truncate text-xs font-semibold uppercase tracking-wider text-accent">{set.subject}</span>}
        </div>
        <h3 className="line-clamp-2 font-headline text-lg font-bold leading-snug text-ink">{set.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
          <span>{set.card_count} {set.card_count === 1 ? 'card' : 'cards'}</span>
          {hasDraft && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">
              <Clock className="h-3 w-3" aria-hidden />
              Unsaved cards
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
          {set.lastStudiedAt ? (
            <span className="text-ink-muted">
              Studied {relativeDate(set.lastStudiedAt)}
              {set.lastScore != null && (
                <span className={cn('ml-1.5 font-semibold', set.lastScore >= 80 ? 'text-good' : set.lastScore >= 50 ? 'text-warn' : 'text-bad')}>
                  {set.lastScore}%
                </span>
              )}
            </span>
          ) : (
            <span className="text-ink-muted">Not studied yet</span>
          )}
          <span title={vis.label} className="text-ink-muted">
            <vis.icon className="h-3.5 w-3.5" aria-label={vis.label} />
          </span>
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <Menu
          trigger={(props) => (
            <button
              type="button"
              {...props}
              aria-label={`Options for ${set.title}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-ink-muted backdrop-blur transition hover:bg-paper-2 hover:text-ink"
            >
              <EllipsisVertical className="h-4 w-4" aria-hidden />
            </button>
          )}
        >
          {(close) => (
            <>
              {set.card_count > 0 && (
                <MenuItem href={`/sets/${set.id}/study`} onSelect={close} icon={<Play className="h-4 w-4 text-ink-muted" aria-hidden />}>Study</MenuItem>
              )}
              <MenuItem tone="danger" onSelect={() => { close(); setConfirming(true) }} icon={<Trash2 className="h-4 w-4" aria-hidden />}>Delete set</MenuItem>
            </>
          )}
        </Menu>
      </div>

      {confirming && <Modal open onClose={() => setConfirming(false)} title="Delete this set?" description={`“${set.title}” and its ${plural(set.card_count, 'card')} will be gone for good. This can't be undone.`}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirming(false)}>Keep it</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete set</Button>
        </div>
      </Modal>}
    </div>
  )
}
