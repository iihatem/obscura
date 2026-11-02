import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Card, FlashCard } from '@/types'
import ForkCTA from './ForkCTA'
import { Star } from 'lucide-react'
import { plural } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ShareSet {
  id: string
  title: string
  description: string | null
  subject: string | null
  card_count: number
  star_count: number
  owner_display_name: string | null
  visibility: string
}

type SharedSet = { set: ShareSet; cards: Card[] }

/** The set, `null` if no such link exists, or `'waking'` if the API didn't answer. */
async function fetchSharedSet(token: string): Promise<SharedSet | null | 'waking'> {
  try {
    const res = await fetch(`${API_URL}/sets/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
    if (res.status === 404) return null
    // A sleeping Space answers with an HTML holding page, sometimes with a 200.
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return 'waking'
    return await res.json()
  } catch {
    return 'waking'
  }
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchSharedSet(token)

  if (!data) notFound()
  if (data === 'waking') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
        <meta httpEquiv="refresh" content="8" />
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <h1 className="text-lg font-bold text-ink">Loading this study set…</h1>
        <p className="max-w-sm text-sm text-ink-muted">
          The study server is waking up. This page will refresh by itself in a few seconds.
        </p>
      </div>
    )
  }

  const { set, cards } = data
  const flashcards = cards.filter((c): c is FlashCard => c.type === 'flashcard').slice(0, 5)
  const diagramCount = cards.filter((c) => c.type === 'diagram').length

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/frog.svg" alt="" className="h-7 w-7 rounded-md" />
          <span className="font-headline text-lg font-extrabold tracking-tight text-ink">Obscura</span>
        </Link>
        <Link href={`/login?redirect=${encodeURIComponent(`/s/${token}`)}`} className="text-sm font-medium text-ink-muted hover:text-ink">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pb-16 pt-6 sm:px-6">
        <section>
          <p className="text-sm font-semibold text-accent">A study set shared with you</p>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-ink sm:text-4xl">{set.title}</h1>
          {set.description && <p className="mt-2 text-ink-muted">{set.description}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {set.subject && <span>{set.subject}</span>}
            <span>{[
              cards.length - diagramCount ? plural(cards.length - diagramCount, 'flashcard') : null,
              diagramCount ? plural(diagramCount, 'diagram') : null,
            ].filter(Boolean).join(' · ') || plural(set.card_count, 'card')}</span>
            {set.owner_display_name && <span>by {set.owner_display_name}</span>}
            {set.star_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current text-warn" aria-hidden />
                {set.star_count}
              </span>
            )}
          </p>
        </section>

        <section className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-headline text-lg font-bold text-ink">Study it yourself</p>
            <p className="mt-1 text-sm text-ink-muted">Copy it into your library to study it, edit the cards, or add your own.</p>
          </div>
          <ForkCTA setId={set.id} token={token} />
        </section>

        {flashcards.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink">
              A look inside <span className="font-normal text-ink-muted">{flashcards.length} of {set.card_count}</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {flashcards.map((card) => (
                <li key={card.id} className="rounded-2xl border border-line bg-surface px-5 py-4">
                  <p className="font-medium text-ink">{card.front}</p>
                  <p className="mt-2 border-t border-line pt-2 text-ink-muted">{card.back}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
