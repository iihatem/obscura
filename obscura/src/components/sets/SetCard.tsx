'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Set } from '@/types'
import { proxyImageUrl } from '@/lib/utils'
import { apiFetch, errorMessage } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import Icon from '@/components/ui/Icon'

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export default function SetCard({ set, hasDraft = false }: { set: Set; hasDraft?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await apiFetch(`/sets/${set.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't delete the set. Please try again."))
      toast(`Deleted “${set.title}”`)
      router.refresh()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleting(false)
      setMenuOpen(false)
      setConfirming(false)
    }
  }

  return (
    <div className="relative group">
      <Link
        href={`/sets/${set.id}`}
        className="flex flex-col gap-4 rounded-xl bg-surface p-6 border border-line shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300"
      >
        {/* Thumbnail */}
        {set.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyImageUrl(set.thumbnail_url)}
            alt=""
            className="w-full h-28 object-cover rounded-lg bg-paper-2"
          />
        )}

        {/* Subject tag */}
        <div className="flex items-start justify-between gap-2 pr-6">
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              {set.subject}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-headline text-lg font-bold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-2"
        >
          {set.title}
        </h3>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted font-medium">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Icon name="quiz" size={16} />
            {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
          </div>
          {hasDraft && (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-accent/10 px-2 py-0.5 text-accent">
              <Icon name="pending_actions" size={14} />
              Unsaved cards
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-paper-2">
          <span className="text-xs text-ink-muted">{relativeDate(set.updated_at)}</span>
          <span
            className={`text-[11px] font-bold uppercase tracking-widest ${set.visibility === 'public' ? 'text-accent' : 'text-ink-muted'}`}
          >
            {set.visibility}
          </span>
        </div>
      </Link>

      {/* More menu */}
      <div ref={menuRef} className="absolute top-4 right-4 z-10">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o) }}
          aria-label={`Options for ${set.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center justify-center w-7 h-7 rounded-md text-line hover:text-ink hover:bg-paper transition-colors"
        >
          <Icon name="more_vert" size={18} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-surface border border-line rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
            {!confirming ? (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-bad hover:bg-bad-soft transition-colors text-left"
              >
                <Icon name="delete" size={16} />
                Delete set
              </button>
            ) : (
              <div className="p-4 space-y-3">
                <p className="text-xs text-ink-muted font-medium">Delete &quot;{set.title}&quot;? This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete() }}
                    disabled={deleting}
                    className="flex-1 h-8 rounded-lg bg-bad text-on-ink text-xs font-bold hover:bg-bad disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                    className="flex-1 h-8 rounded-lg border border-line text-xs font-bold text-ink-muted hover:bg-paper transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
