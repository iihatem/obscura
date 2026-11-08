import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { statsBySet, relativeDate, type SessionRow } from '@/lib/library'
import { tally } from '@/lib/study'
import { cn, plural } from '@/lib/utils'
import { initialsOf } from '@/lib/utils'
import ApiKeys from '@/components/profile/ApiKeys'
import NameEditor from '@/components/profile/NameEditor'
import ThemePicker from '@/components/profile/ThemePicker'
import SignOutButton from '@/components/profile/SignOutButton'

const MODE: Record<string, string> = { flashcard: 'Flashcards', diagram: 'Diagrams', mixed: 'Everything', test: 'Practice test' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
  const db = supabase as any
  const [{ data: profile }, { count: setCount }, { data: sessions }] = await Promise.all([
    db.from('profiles').select('display_name').eq('id', user.id).single(),
    db.from('sets').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    db.from('study_sessions')
      .select('id, set_id, mode, completed_at, sets(title), card_results(grade)')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(200),
  ])

  type Row = SessionRow & { id: string; mode: string; sets: { title: string } | null }
  const rows: Row[] = (sessions ?? []).filter((s: Row) => s.card_results?.length)
  const cardsStudied = rows.reduce((n, s) => n + (s.card_results?.length ?? 0), 0)
  const setsStudied = statsBySet(rows).size
  const name: string | null = profile?.display_name ?? null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 py-4 sm:py-8">
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft font-headline text-xl font-bold text-accent-ink">
          {initialsOf(name ?? user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h1 className="truncate text-[28px] font-extrabold text-ink">{name || 'Add your name'}</h1>
            <NameEditor userId={user.id} name={name} />
          </div>
          <p className="truncate text-ink-muted">{user.email}</p>
        </div>
      </header>

      <section aria-label="Your stats" className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface">
        {[
          { label: 'Sets', value: setCount ?? 0 },
          { label: 'Sets studied', value: setsStudied },
          { label: 'Cards answered', value: cardsStudied },
        ].map((s) => (
          <div key={s.label} className="px-4 py-4 sm:px-5">
            <p className="font-headline text-[28px] font-extrabold tabular-nums text-ink">{s.value.toLocaleString()}</p>
            <p className="text-[13px] text-ink-muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Recent sessions</h2>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-ink-muted">
            Sessions you finish show up here with your score.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {rows.slice(0, 8).map((s) => {
              const t = tally(s.card_results!.map((r) => r.grade))
              return (
                <li key={s.id}>
                  <Link href={`/sets/${s.set_id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-paper-2 sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{s.sets?.title ?? 'Deleted set'}</span>
                      <span className="block text-[13px] text-ink-muted">
                        {MODE[s.mode] ?? s.mode} · {plural(t.total, 'card')} · {relativeDate(s.completed_at!)}
                      </span>
                    </span>
                    <span className={cn('shrink-0 font-headline text-lg font-bold tabular-nums', t.pct >= 80 ? 'text-good' : t.pct >= 50 ? 'text-warn' : 'text-bad')}>
                      {t.pct}%
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Appearance</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-ink-muted">System follows your phone or computer&apos;s setting.</p>
          <ThemePicker />
        </div>
      </section>

      <ApiKeys />

      <section className="border-t border-line pt-6">
        <SignOutButton />
      </section>
    </div>
  )
}
