import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetGrid from '@/components/sets/SetGrid'
import type { Set } from '@/types'

export default async function LibraryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await (supabase.from('sets') as any)
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const sets: Set[] = data ?? []

  return (
    <div className="p-8 lg:p-12 space-y-12">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="flex items-end justify-between">
        <div className="space-y-2">
          <h2
            className="text-4xl font-extrabold tracking-tight text-[#051125]"
            style={{ fontFamily: 'var(--font-manrope)' }}
          >
            Library Collections
          </h2>
          <p className="text-[#45474d] max-w-md">
            Curating your intellectual assets. Access and organize your quiz sets with scholarly precision.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/sets/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 scholar-gradient text-white rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#051125]/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Set
          </Link>
        </div>
      </section>

      {/* ── AI Spotlight Banner ───────────────────────────────────── */}
      {/* {sets.length > 0 && (
        <section className="relative overflow-hidden rounded-xl scholar-gradient p-10 text-white flex justify-between items-center group">
          <div className="relative z-10 space-y-4 max-w-lg">
            <span className="inline-block px-3 py-1 bg-[#006972]/30 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              AI Spotlight
            </span>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-manrope)' }}>
              {sets[0]?.title ?? 'Your Latest Set'}
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Your AI Curator is ready to generate supplementary practice questions for your most recent collection.
            </p>
            <div className="flex gap-4 pt-4">
              <Link
                href={`/sets/${sets[0]?.id}`}
                className="bg-[#9ff0fb] text-[#051125] px-6 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform active:scale-95"
              >
                Open Set
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined" style={{ fontSize: '12rem' }}>psychology</span>
          </div>
        </section>
      )} */}

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <SetGrid sets={sets} />
    </div>
  )
}
