'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Set } from '@/types'
import { proxyImageUrl } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

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

export default function SetCard({ set }: { set: Set }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
      await apiFetch(`/sets/${set.id}`, { method: 'DELETE' })
      router.refresh()
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
        className="flex flex-col gap-4 rounded-xl bg-white p-6 border border-[#e7e8e9] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300"
      >
        {/* Thumbnail */}
        {set.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyImageUrl(set.thumbnail_url)}
            alt=""
            className="w-full h-28 object-cover rounded-lg bg-[#edeeef]"
          />
        )}

        {/* Subject tag */}
        <div className="flex items-start justify-between gap-2 pr-6">
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#006972]">
              {set.subject}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-lg font-bold text-[#051125] leading-snug group-hover:text-[#006972] transition-colors line-clamp-2"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          {set.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-[#45474d] font-medium">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">quiz</span>
            {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#edeeef]">
          <span className="text-xs text-[#75777d]">{relativeDate(set.updated_at)}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: set.visibility === 'public' ? '#006972' : '#75777d' }}
          >
            {set.visibility}
          </span>
        </div>
      </Link>

      {/* More menu */}
      <div ref={menuRef} className="absolute top-4 right-4 z-10">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o) }}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[#c5c6cd] hover:text-[#051125] hover:bg-[#f3f4f5] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#e7e8e9] rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
            {!confirming ? (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete set
              </button>
            ) : (
              <div className="p-4 space-y-3">
                <p className="text-xs text-[#45474d] font-medium">Delete "{set.title}"? This can't be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete() }}
                    disabled={deleting}
                    className="flex-1 h-8 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                    className="flex-1 h-8 rounded-lg border border-[#e7e8e9] text-xs font-bold text-[#45474d] hover:bg-[#f3f4f5] transition-colors"
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
