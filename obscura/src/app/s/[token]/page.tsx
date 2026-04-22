import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Card, FlashCard } from '@/types'
import ForkCTA from './ForkCTA'

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

async function fetchSharedSet(token: string): Promise<{ set: ShareSet; cards: Card[] } | null> {
  try {
    const res = await fetch(`${API_URL}/sets/share/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchSharedSet(token)

  if (!data) notFound()

  const { set, cards } = data
  const flashcards = cards.filter((c): c is FlashCard => c.type === 'flashcard').slice(0, 4)

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#e7e8e9] bg-white">
        <Link
          href="/"
          className="text-xl font-black text-[#051125] tracking-tight"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          Obscura
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#45474d] hover:text-[#051125] transition-colors font-medium">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-bold px-4 py-2 rounded-lg scholar-gradient text-white hover:opacity-90 transition-opacity"
          >
            Sign up free
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-10">
        {/* Set info */}
        <section className="space-y-4">
          {set.subject && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#006972]">
              {set.subject}
            </span>
          )}
          <h1
            className="text-3xl font-extrabold text-[#051125] tracking-tight"
            style={{ fontFamily: 'var(--font-manrope)' }}
          >
            {set.title}
          </h1>
          {set.description && (
            <p className="text-[#45474d] leading-relaxed">{set.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#75777d] font-medium">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">quiz</span>
              {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1", color: '#e8b400' }}>star</span>
              {set.star_count}
            </div>
            {set.owner_display_name && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">person</span>
                {set.owner_display_name}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white rounded-xl border border-[#e7e8e9] p-8 flex flex-col items-center gap-4 text-center shadow-sm">
          <span className="material-symbols-outlined text-[40px] text-[#006972]">school</span>
          <div>
            <p className="font-bold text-[#051125] text-lg" style={{ fontFamily: 'var(--font-manrope)' }}>
              Study this set
            </p>
            <p className="text-sm text-[#75777d] mt-1">
              Copy it to your library and start studying with flashcards and diagrams.
            </p>
          </div>
          <ForkCTA setId={set.id} token={token} />
        </section>

        {/* Sample cards preview */}
        {flashcards.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#45474d]">
              Preview — {flashcards.length} of {set.card_count} cards
            </h2>
            <div className="space-y-3">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl border border-[#e7e8e9] px-6 py-4 shadow-sm"
                >
                  <p className="text-sm font-bold text-[#051125]">{card.front}</p>
                  <p className="text-sm text-[#45474d] mt-1 pt-2 border-t border-[#edeeef]">{card.back}</p>
                </div>
              ))}
            </div>
            {set.card_count > flashcards.length && (
              <p className="text-xs text-[#75777d] text-center">
                +{set.card_count - flashcards.length} more cards after copying
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
