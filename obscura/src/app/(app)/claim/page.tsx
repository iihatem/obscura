'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { apiFetch, errorMessage, withColdStartRetry } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { cardCount, clearTrialDraft, loadTrialDraft, type TrialDraft } from '@/lib/trial'
import { plural } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

function titleFrom(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim()
  return (base || 'My first set').slice(0, 200)
}

/**
 * Where the landing page sends a visitor after sign-up: the cards they made
 * before having an account become their first set.
 */
export default function ClaimPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [draft, setDraft] = useState<TrialDraft | null>(null)
  const [error, setError] = useState('')
  const [waking, setWaking] = useState(false)
  const started = useRef(false)
  // A retry after a failure reuses the set it already made.
  const setIdRef = useRef<string | null>(null)

  const claim = useCallback(async (d: TrialDraft) => {
    setError('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const userId = session?.user.id
      if (!userId) throw new Error('Your session ended. Sign in again to save your cards.')

      if (!setIdRef.current) {
        const created = await withColdStartRetry(() => apiFetch('/sets', {
          method: 'POST',
          body: JSON.stringify({ title: titleFrom(d.fileName), visibility: 'private' }),
        }), () => setWaking(true))
        if (!created.ok) throw new Error(await errorMessage(created, "Couldn't create your set."))
        setIdRef.current = (await created.json()).id
      }
      const set = { id: setIdRef.current! }

      const cards: Record<string, unknown>[] = []
      for (const r of d.results) {
        if (r.type === 'flashcard') {
          for (const c of r.cards ?? []) cards.push({ type: 'flashcard', front: c.front, back: c.back, source_page: r.pageIndex + 1 })
        } else if (r.imageDataUrl && r.labels?.length) {
          const ext = r.imageDataUrl.startsWith('data:image/png') ? 'png' : 'jpg'
          const up = await apiFetch('/upload/image', {
            method: 'POST',
            body: JSON.stringify({ dataUrl: r.imageDataUrl, path: `${userId}/${set.id}/diagram-${crypto.randomUUID()}.${ext}` }),
          })
          if (!up.ok) throw new Error(await errorMessage(up, "Couldn't upload a diagram."))
          const { publicUrl } = await up.json()
          cards.push({ type: 'diagram', image_url: publicUrl, labels: r.labels, source_page: r.pageIndex + 1 })
        }
      }
      if (cards.length) {
        const saved = await apiFetch('/cards/bulk', { method: 'POST', body: JSON.stringify({ set_id: set.id, cards }) })
        if (!saved.ok) throw new Error(await errorMessage(saved, "Couldn't save your cards."))
      }

      await clearTrialDraft()
      toast(`Saved ${plural(cards.length, 'card')} to your new set`)
      router.replace(`/sets/${set.id}`)
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.')
    } finally {
      setWaking(false)
    }
  }, [router, toast])

  useEffect(() => {
    if (started.current) return
    started.current = true
    loadTrialDraft().then((d) => {
      if (!d || !d.results.length) { router.replace('/library'); return }
      setDraft(d)
      claim(d)
    })
  }, [claim, router])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      {!error ? (
        <>
          <LoaderCircle className="h-8 w-8 animate-spin text-accent" aria-hidden />
          <h1 className="text-[22px] font-bold text-ink">
            {draft ? `Saving your ${plural(cardCount(draft.results), 'card')}…` : 'Getting your cards…'}
          </h1>
          <p className="text-ink-muted">
            {waking ? 'The study server is waking up. This takes a few seconds the first time.' : 'They’re going into a new set in your library.'}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[22px] font-bold text-ink">Your cards aren’t saved yet</h1>
          <p className="text-ink-muted">{error} They’re still in this browser, so nothing is lost.</p>
          <Button onClick={() => draft && claim(draft)}>Try again</Button>
        </>
      )}
    </div>
  )
}
