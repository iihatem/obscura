'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Compass, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cleanQuery, flatten, groupResults, titleOrSubject, type SearchGroups, type SearchHit } from '@/lib/search'
import { cn } from '@/lib/utils'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
  userId: string | null
}

const EMPTY: SearchGroups = { mine: [], public: [] }

export default function SearchDialog({ open, onClose, userId }: SearchDialogProps) {
  const router = useRouter()
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  // The results and the query they answer; while they differ, a search is in flight.
  const [result, setResult] = useState<{ q: string; groups: SearchGroups; error: boolean }>({ q: '', groups: EMPTY, error: false })
  const [active, setActive] = useState(0)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      input.current?.focus()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open])

  // Debounced search; a newer query cancels the older one's result.
  useEffect(() => {
    const q = cleanQuery(query)
    if (!open || q.length < 2) return
    let stale = false
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        const cols = 'id, title, subject, card_count'
        const mineReq = userId
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase SDK generic inference
          ? (supabase.from('sets') as any).select(cols).eq('owner_id', userId).or(titleOrSubject(q)).order('updated_at', { ascending: false }).limit(6)
          : Promise.resolve({ data: [] })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase SDK generic inference
        const publicReq = (supabase.from('sets') as any).select(cols).eq('visibility', 'public').or(titleOrSubject(q)).order('star_count', { ascending: false }).limit(6)
        const [mine, pub] = await Promise.all([mineReq, publicReq])
        if (stale) return
        if (mine.error || pub.error) throw mine.error ?? pub.error
        setResult({ q, groups: groupResults((mine.data ?? []) as SearchHit[], (pub.data ?? []) as SearchHit[]), error: false })
        setActive(0)
      } catch {
        if (!stale) setResult({ q, groups: EMPTY, error: true })
      }
    }, 200)
    return () => { stale = true; clearTimeout(timer) }
  }, [query, open, userId])

  function close() {
    setQuery('')
    onClose()
  }

  function go(hit: SearchHit) {
    close()
    router.push(`/sets/${hit.id}`)
  }

  const q = cleanQuery(query)
  const current = result.q === q
  const groups = current ? result.groups : EMPTY
  const status = q.length < 2 ? 'idle' : !current ? 'loading' : result.error ? 'error' : 'done'
  const flat = flatten(groups)

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active]) }
  }

  function renderGroup(label: string, hits: SearchHit[], offset: number, Icon: typeof BookOpen) {
    if (!hits.length) return null
    return (
      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        {hits.map((h, i) => {
          const index = offset + i
          return (
            <button
              key={h.id}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(h)}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-left', index === active ? 'bg-paper-2' : 'hover:bg-paper-2')}
            >
              <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{h.title}</span>
                {h.subject && <span className="block truncate text-[13px] text-ink-muted">{h.subject}</span>}
              </span>
              <span className="shrink-0 text-[13px] text-ink-muted">{h.card_count} cards</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); close() }}
      aria-label="Search sets"
      className={cn(
        'fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-surface p-0 text-ink backdrop:bg-scrim',
        'sm:mx-auto sm:mt-[12vh] sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-3xl sm:border sm:border-line sm:shadow-lift'
      )}
    >
      <div className="flex h-full flex-col sm:h-auto sm:max-h-[70vh]">
        <div className="flex items-center gap-3 border-b border-line px-4 pt-[env(safe-area-inset-top)]">
          <Search className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search your sets and public sets"
            aria-label="Search sets"
            role="combobox"
            aria-controls="search-results"
            aria-expanded={flat.length > 0}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <button type="button" onClick={close} aria-label="Close search" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-paper-2 hover:text-ink">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div id="search-results" role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {q.length < 2 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">Type a set name or subject, like “Cell biology”.</p>
          ) : status === 'error' ? (
            <p className="px-3 py-8 text-center text-sm text-bad">Search isn&apos;t working right now. Check your connection and try again.</p>
          ) : status === 'done' && flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">No sets match “{q}”.</p>
          ) : status === 'loading' && flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">Searching…</p>
          ) : (
            <>
              {renderGroup('Your sets', groups.mine, 0, BookOpen)}
              {renderGroup('Public sets', groups.public, groups.mine.length, Compass)}
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
