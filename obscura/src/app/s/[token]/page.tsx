import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Card, FlashCard } from '@/types'
import ForkCTA from './ForkCTA'
import Icon from '@/components/ui/Icon'

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
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3 px-6 text-center">
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
  const flashcards = cards.filter((c): c is FlashCard => c.type === 'flashcard').slice(0, 4)

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-line bg-surface">
        <Link
          href="/"
          className="font-headline text-xl font-black text-ink tracking-tight"
        >
          Obscura
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/login?redirect=${encodeURIComponent(`/s/${token}`)}`} className="text-sm text-ink-muted hover:text-ink transition-colors font-medium">
            Sign in
          </Link>
          <Link
            href={`/signup?redirect=${encodeURIComponent(`/s/${token}`)}`}
            className="text-sm font-bold px-4 py-2 rounded-lg bg-ink text-on-ink hover:opacity-90 transition-opacity"
          >
            Sign up free
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-10">
        {/* Set info */}
        <section className="space-y-4">
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              {set.subject}
            </span>
          )}
          <h1
            className="font-headline text-3xl font-extrabold text-ink tracking-tight"
          >
            {set.title}
          </h1>
          {set.description && (
            <p className="text-ink-muted leading-relaxed">{set.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted font-medium">
            <div className="flex items-center gap-1.5">
              <Icon name="quiz" size={16} />
              {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="star" size={16} filled className="text-warn" />
              {set.star_count}
            </div>
            {set.owner_display_name && (
              <div className="flex items-center gap-1.5">
                <Icon name="person" size={16} />
                {set.owner_display_name}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-surface rounded-xl border border-line p-8 flex flex-col items-center gap-4 text-center shadow-sm">
          <Icon name="school" size={40} className="text-accent" />
          <div>
            <p className="font-headline font-bold text-ink text-lg">
              Study this set
            </p>
            <p className="text-sm text-ink-muted mt-1">
              Copy it to your library and start studying with flashcards and diagrams.
            </p>
          </div>
          <ForkCTA setId={set.id} token={token} />
        </section>

        {/* Sample cards preview */}
        {flashcards.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted">
              Preview — {flashcards.length} of {set.card_count} cards
            </h2>
            <div className="space-y-3">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="bg-surface rounded-xl border border-line px-6 py-4 shadow-sm"
                >
                  <p className="text-sm font-bold text-ink">{card.front}</p>
                  <p className="text-sm text-ink-muted mt-1 pt-2 border-t border-paper-2">{card.back}</p>
                </div>
              ))}
            </div>
            {set.card_count > flashcards.length && (
              <p className="text-xs text-ink-muted text-center">
                +{set.card_count - flashcards.length} more cards after copying
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
