import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowRight, Brain, FileText, Moon, PenLine, Save, Smartphone } from 'lucide-react'
import { cn, plural } from '@/lib/utils'
import TryBench from '@/components/landing/TryBench'
import DiagramDemo from '@/components/landing/DiagramDemo'
import HeaderActions from '@/components/landing/HeaderActions'

// Public sets change slowly; refresh the list at most hourly.
export const revalidate = 3600

interface PublicSet {
  id: string
  title: string
  subject: string | null
  card_count: number
  share_token: string | null
  star_count: number
}

async function topPublicSets(): Promise<PublicSet[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data } = await db.from('sets')
      .select('id, title, subject, card_count, share_token, star_count')
      .eq('visibility', 'public')
      .gte('card_count', 5)
      .order('star_count', { ascending: false })
      .order('card_count', { ascending: false })
      .limit(4)
    return (data ?? []) as PublicSet[]
  } catch {
    return []
  }
}

function Tag({ page }: { page: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
      <FileText className="h-3 w-3" aria-hidden />p. {page}
    </span>
  )
}

function Phone({ theme, label, body, page, count, className }: { theme: 'light' | 'dark'; label: string; body: string; page: number; count: string; className?: string }) {
  return (
    <div className={cn(theme === 'dark' ? 'theme-dark' : 'theme-light', 'flex h-[430px] w-[220px] flex-col gap-2.5 rounded-[34px] border border-line bg-paper p-3 text-ink shadow-lift', className)} aria-hidden>
      <div className="flex items-center justify-between px-1.5 pt-1 text-[11px] text-ink-muted">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface">×</span>
        <span>{count}</span>
      </div>
      <div className="h-1 rounded-full bg-line"><div className="h-full w-[45%] rounded-full bg-accent" /></div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-[18px] border border-line bg-surface p-4 text-center">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-accent">{label}</span>
        <p className="font-headline text-[15px] font-bold leading-snug">{body}</p>
        <span className="text-[10px] text-ink-muted">from p. {page}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[10.5px] font-semibold">
        <span className="rounded-[10px] bg-good-soft py-2.5 text-center text-good">Confident</span>
        <span className="rounded-[10px] bg-warn-soft py-2.5 text-center text-warn">Almost</span>
        <span className="rounded-[10px] bg-bad-soft py-2.5 text-center text-bad">Need review</span>
      </div>
    </div>
  )
}

export default async function HomePage() {
  const sets = await topPublicSets()

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 pt-[env(safe-area-inset-top)] sm:h-[72px] sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/frog.svg" alt="" className="h-7 w-7 rounded-md" />
          <span className="font-headline text-lg font-extrabold tracking-tight">Obscura</span>
        </Link>
        <nav aria-label="Page sections" className="hidden gap-6 text-sm text-ink-muted md:flex">
          <a href="#diagrams" className="hover:text-ink">Diagrams</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          {sets.length > 0 && <a href="#sets" className="hover:text-ink">Public sets</a>}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <HeaderActions />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:pb-20 lg:pt-12">
          <div className="lg:pt-6">
            <h1 className="text-[clamp(40px,5.6vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              Turn your lecture into a quiz. <span className="text-accent">Diagrams included.</span>
            </h1>
            <p className="mt-6 max-w-[42ch] text-lg text-ink-muted">
              Drop in your slides. Obscura writes flashcards from the text and <b className="font-semibold text-ink">covers every label on the diagrams</b>, so you practise remembering instead of rereading.
            </p>
            <ul className="mt-8 flex flex-col gap-2.5 text-[15px]">
              {['Try it with your own lecture. No account needed.', 'Every card shows the slide it came from.', 'Edit or delete anything before it’s saved.'].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div id="try" className="scroll-mt-6">
            <TryBench />
          </div>
        </section>

        {/* The two worries */}
        <section className="border-y border-line bg-paper-2">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 md:gap-10">
            <div>
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><Brain className="h-[18px] w-[18px]" aria-hidden /></span>
              <h2 className="text-[19px] font-extrabold">You do the remembering</h2>
              <p className="mt-1.5 text-ink-muted">Obscura only asks the questions. Every answer comes out of your own head, which is how studying is supposed to work.</p>
            </div>
            <div>
              <span className="mb-4 inline-flex"><Tag page={12} /></span>
              <h2 className="text-[19px] font-extrabold">Check any card against your slides</h2>
              <p className="mt-1.5 text-ink-muted">Every card is tagged with the page it came from, so you can see exactly where an answer came from.</p>
            </div>
            <div>
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><PenLine className="h-[18px] w-[18px]" aria-hidden /></span>
              <h2 className="text-[19px] font-extrabold">Nothing is saved until you say so</h2>
              <p className="mt-1.5 text-ink-muted">Read every card first. Reword it, delete it, or move a label box, then save.</p>
            </div>
          </div>
        </section>

        {/* Diagrams */}
        <section id="diagrams" className="mx-auto grid max-w-6xl scroll-mt-6 items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold leading-[1.06]">Half your lecture is pictures. Now you can study them.</h2>
            <p className="mt-4 text-lg text-ink-muted">Flashcard apps skip diagrams. Obscura covers every label and asks you to name what’s underneath. Small spelling slips still count.</p>
            <dl className="mt-7 flex flex-col text-[15px]">
              {[
                { typed: 'Golgi apparatus', want: null, verdict: 'Correct', cls: 'bg-good-soft text-good' },
                { typed: 'mitocondria', want: 'Mitochondrion', verdict: 'Almost', cls: 'bg-warn-soft text-warn' },
                { typed: 'ribosome', want: 'Nucleus', verdict: 'Not quite', cls: 'bg-bad-soft text-bad' },
              ].map((r) => (
                <div key={r.typed} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                  <dt>{r.typed}{r.want && <span className="ml-1.5 text-[13px] text-ink-muted">for {r.want}</span>}</dt>
                  <dd className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', r.cls)}>{r.verdict}</dd>
                </div>
              ))}
            </dl>
          </div>
          <DiagramDemo />
        </section>

        {/* One slide in */}
        <section id="how" className="scroll-mt-6 border-y border-line bg-paper-2">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <h2 className="max-w-2xl text-[clamp(32px,4vw,46px)] font-extrabold leading-[1.06]">One slide in. The questions your exam will ask, out.</h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-muted">Obscura reads each page the way you would and writes cards about what matters, in plain words you can edit.</p>
            <div className="mt-12 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              <div className="relative flex aspect-[16/10] flex-col gap-3.5 rounded-2xl border border-line bg-surface p-6 shadow-lift sm:p-7">
                <span className="absolute right-3.5 top-3.5"><Tag page={3} /></span>
                <h3 className="font-headline text-[clamp(16px,2vw,22px)] font-extrabold">Mitochondria: the cell’s power plant</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[clamp(12px,1.25vw,15px)] text-ink-muted">
                  <li>Double membrane: smooth outer, folded inner (<mark className="rounded-sm bg-accent-soft px-0.5 text-accent-ink">cristae</mark>)</li>
                  <li>Cristae <mark className="rounded-sm bg-accent-soft px-0.5 text-accent-ink">increase surface area</mark> for the electron transport chain</li>
                  <li><mark className="rounded-sm bg-accent-soft px-0.5 text-accent-ink">ATP synthase</mark> uses the proton gradient to make ATP</li>
                  <li>Has its own circular DNA</li>
                </ul>
              </div>
              <ArrowRight className="mx-auto h-8 w-8 rotate-90 text-accent md:rotate-0" aria-hidden />
              <div className="flex flex-col gap-2.5">
                {[
                  ['What are the folds of the inner mitochondrial membrane called?', 'Cristae.'],
                  ['Why does the inner membrane fold?', 'To increase surface area for the electron transport chain.'],
                  ['What does ATP synthase use to make ATP?', 'The proton gradient across the inner membrane.'],
                ].map(([q, a]) => (
                  <div key={q} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5">
                    <span className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Question</span><Tag page={3} /></span>
                    <span className="font-headline text-[15px] font-bold leading-snug">{q}</span>
                    <span className="border-t border-dashed border-line pt-1.5 text-sm text-ink-muted">{a}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-[15px] text-ink-muted">
              <span><b className="font-headline text-ink">Upload</b> a PDF or a photo</span>
              <span><b className="font-headline text-ink">Pick</b> the pages that matter</span>
              <span><b className="font-headline text-ink">Review</b> every card</span>
              <span><b className="font-headline text-ink">Study</b> anywhere</span>
            </p>
          </div>
        </section>

        {/* Phone */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="flex justify-center gap-5">
            <Phone theme="light" label="Question" body="Which organelle packages proteins for secretion?" page={4} count="12 of 26" />
            <Phone theme="dark" label="Answer" body="Cristae, which add surface area for the electron transport chain." page={3} count="13 of 26" className="mt-10 hidden sm:flex" />
          </div>
          <div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold leading-[1.06]">Make it on your laptop. Study it on the bus.</h2>
            <p className="mt-4 text-lg text-ink-muted">Your sets sync the moment you save them. Studying fills the whole screen, with the buttons where your thumb already is.</p>
            <ul className="mt-7 flex flex-col gap-4">
              {[
                { icon: Smartphone, title: 'Made for one hand', text: 'Tap to flip, then Confident, Almost or Need review. Or just swipe.' },
                { icon: Moon, title: 'Dark at night', text: 'Follows your phone’s setting, so late study doesn’t feel like staring at a lamp.' },
                { icon: Save, title: 'Never loses your work', text: 'Close the tab halfway through and your new cards are still there.' },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  <span><b className="block font-headline">{title}</b><span className="text-ink-muted">{text}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Public sets */}
        {sets.length > 0 && (
          <section id="sets" className="scroll-mt-6 border-y border-line bg-paper-2">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
              <h2 className="max-w-2xl text-[clamp(32px,4vw,46px)] font-extrabold leading-[1.06]">Someone in your course might have started already.</h2>
              <p className="mt-4 max-w-2xl text-lg text-ink-muted">Students share their sets publicly. Copy one into your library and make it yours.</p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sets.map((s) => (
                  <Link key={s.id} href={s.share_token ? `/s/${s.share_token}` : '/signup'} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 transition hover:border-ink-muted/40 hover:shadow-lift">
                    {s.subject && <span className="truncate text-xs font-semibold uppercase tracking-wider text-accent">{s.subject}</span>}
                    <b className="line-clamp-2 font-headline text-[15.5px] leading-snug">{s.title}</b>
                    <span className="mt-auto text-[13px] text-ink-muted">{plural(s.card_count, 'card')}{s.star_count > 0 && ` · ${plural(s.star_count, 'star')}`}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Closing */}
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-28">
          <h2 className="mx-auto max-w-[16ch] text-[clamp(36px,5vw,60px)] font-extrabold leading-[1.03]">Your next lecture is already a quiz.</h2>
          <p className="mt-4 text-lg text-ink-muted">It just hasn’t been uploaded yet.</p>
          <a href="#try" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-on-ink transition hover:bg-ink/88">
            Make my first quiz
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-7 text-sm text-ink-muted sm:px-6">
          <span className="font-headline font-extrabold text-ink">Obscura</span>
          <span className="flex-1" />
          <Link href="/login" className="hover:text-ink">Sign in</Link>
          <Link href="/signup" className="hover:text-ink">Create an account</Link>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  )
}
