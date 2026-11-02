'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, FileUp, Image as ImageIcon, LoaderCircle, RotateCcw, Sparkles, Text, X } from 'lucide-react'
import {
  TURNSTILE_SITE_KEY, TrialError, cardCount, keepTrialDraft, startTrial, trialGenerate, trialPdfPages, trialStatus,
  type TrialPage, type TrialResult,
} from '@/lib/trial'
import { detectPageType } from '@/components/upload/PagePicker'
import { cn, plural } from '@/lib/utils'
import Button, { buttonClass } from '@/components/ui/Button'
import PageTag from '@/components/ui/PageTag'
import CellDiagram, { cellDiagramDataUrl } from './CellDiagram'
import CoveredDiagram from './CoveredDiagram'
import { SAMPLE_FILE, SAMPLE_RESULTS } from './sample'
import { useTurnstile } from './useTurnstile'

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; label: string }
  | { kind: 'pick'; fileName: string; pages: TrialPage[]; pass: string; left: number }
  | { kind: 'generating'; fileName: string; pages: TrialPage[]; status: Record<number, 'pending' | 'done' | 'error'> }
  | { kind: 'results'; fileName: string; results: TrialResult[]; sample: boolean; note?: string }
  | { kind: 'blocked'; title: string; message: string }

const MAX_PDF = 25 * 1024 * 1024
const MAX_IMAGE = 15 * 1024 * 1024
const SIGNUP = '/signup?redirect=%2Fclaim'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error("We couldn't read that file."))
    r.readAsDataURL(file)
  })
}

export default function TryBench() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const [waking, setWaking] = useState(false)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const sampleSvg = useRef<HTMLDivElement>(null)
  const warmed = useRef(false)
  const { host, getToken } = useTurnstile()

  // The API sleeps when idle; nudge it awake as soon as someone reaches for the bench.
  function warm() {
    if (warmed.current || !TURNSTILE_SITE_KEY) return
    warmed.current = true
    trialStatus().catch(() => {})
  }

  const onWaking = () => setWaking(true)

  function blocked(title: string, message: string) {
    setPhase({ kind: 'blocked', title, message })
  }

  async function handleFile(file: File) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!isPdf && !isImage) return blocked('That file type won’t work', 'Upload a PDF of your slides, or a JPG, PNG or WebP of one diagram.')
    if (file.size > (isPdf ? MAX_PDF : MAX_IMAGE)) return blocked('That file is too big to try here', `Files up to ${isPdf ? 25 : 15} MB work without an account. Sign up free to upload bigger ones.`)
    if (!TURNSTILE_SITE_KEY) return blocked('Upload with a free account', 'Uploading your own lecture needs an account for now. It takes a few seconds with Google.')

    setWaking(false)
    setPhase({ kind: 'working', label: 'Getting ready…' })
    try {
      const status = await trialStatus()
      if (!status.enabled) return blocked('Upload with a free account', 'Uploading your own lecture needs an account right now. It takes a few seconds with Google.')
      const token = await getToken()
      const { pass, pagesLeft } = await startTrial(token, onWaking)
      if (pagesLeft <= 0) return blocked('That’s today’s free pages', 'Sign up free to turn the rest of your lecture into cards, or come back tomorrow.')

      if (isImage) {
        const dataUrl = await readAsDataUrl(file)
        const page: TrialPage = { dataUrl, pageIndex: 0, type: await detectPageType({ dataUrl }) }
        return generate(file.name, [page], pass)
      }

      setPhase({ kind: 'working', label: 'Reading your slides…' })
      const { pages } = await trialPdfPages(file, pass, onWaking)
      if (!pages.length) return blocked('That PDF looks empty', 'Try a different file.')
      const typed: TrialPage[] = await Promise.all(pages.map(async (p) => ({ ...p, type: await detectPageType(p) })))
      // Skip the title slide when there are more pages than free ones.
      const start = typed.length > pagesLeft ? 1 : 0
      setPicked(new Set(typed.slice(start, start + pagesLeft).map((p) => p.pageIndex)))
      setPhase({ kind: 'pick', fileName: file.name, pages: typed, pass, left: Math.min(pagesLeft, typed.length) })
    } catch (err) {
      const message = err instanceof TrialError || err instanceof Error ? err.message : 'Something went wrong.'
      blocked('That didn’t work', message)
    } finally {
      setWaking(false)
    }
  }

  async function generate(fileName: string, pages: TrialPage[], pass: string) {
    const status: Record<number, 'pending' | 'done' | 'error'> = Object.fromEntries(pages.map((p) => [p.pageIndex, 'pending']))
    setPhase({ kind: 'generating', fileName, pages, status: { ...status } })
    const results: TrialResult[] = []
    let note: string | undefined
    for (const page of pages) {
      try {
        results.push(await trialGenerate(page, pass, onWaking))
        status[page.pageIndex] = 'done'
      } catch (err) {
        status[page.pageIndex] = 'error'
        if (err instanceof TrialError && (err.status === 429 || err.status === 401)) { note = err.message; break }
        note = 'Some pages didn’t work. You can still save the rest.'
      }
      setPhase({ kind: 'generating', fileName, pages, status: { ...status } })
    }
    setWaking(false)
    if (!results.length) return blocked('No cards this time', note ?? 'We couldn’t make cards from those pages. Try other pages, or sign up to try more.')
    setPhase({ kind: 'results', fileName, results, sample: false, note })
  }

  async function save(results: TrialResult[], fileName: string, sample: boolean) {
    setSaving(true)
    try {
      let saved = results
      if (sample) {
        const svg = sampleSvg.current?.querySelector('svg')
        const dataUrl = svg ? await cellDiagramDataUrl(svg) : undefined
        saved = results.map((r) => (r.type === 'diagram' ? { ...r, imageDataUrl: dataUrl } : r)).filter((r) => r.type !== 'diagram' || r.imageDataUrl)
      }
      await keepTrialDraft({ fileName, results: saved })
      router.push(SIGNUP)
    } catch {
      setSaving(false)
    }
  }

  function reset() {
    setPhase({ kind: 'idle' })
    setPicked(new Set())
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div onPointerEnter={warm} onFocus={warm} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-[13px] text-ink-muted">
        <span className="flex gap-1.5" aria-hidden><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /></span>
        <span className="truncate">{'fileName' in phase ? phase.fileName : 'New study set'}</span>
      </div>

      <div className="flex min-h-[440px] flex-col p-4 sm:p-5">
        {phase.kind === 'idle' && (
          <div className="flex flex-1 flex-col gap-4">
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className={cn(
                'flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed px-5 py-8 text-center transition-colors',
                dragging ? 'border-accent bg-accent-soft' : 'border-ink-muted/40 bg-paper hover:border-accent'
              )}
            >
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
                <FileUp className="h-6 w-6" aria-hidden />
              </span>
              <span className="font-headline text-xl font-extrabold text-ink">Drop your lecture here</span>
              <span className="max-w-xs text-sm text-ink-muted">A PDF of your slides or a photo of one diagram. We&apos;ll make cards from a few pages, free, no account needed.</span>
              <span className={buttonClass('primary', 'md')}>Choose a file</span>
              <input ref={fileInput} type="file" accept=".pdf,application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-ink-muted">No lecture handy?</span>
              <Button variant="secondary" onClick={() => setPhase({ kind: 'results', fileName: SAMPLE_FILE, results: SAMPLE_RESULTS, sample: true })}>
                <Sparkles className="h-4 w-4" aria-hidden />
                Try a sample lecture
              </Button>
            </div>
          </div>
        )}

        {phase.kind === 'working' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-accent" aria-hidden />
            <p className="font-medium text-ink">{phase.label}</p>
            {waking && <p className="max-w-xs text-sm text-ink-muted">The study server is waking up. This takes a few seconds the first time.</p>}
          </div>
        )}

        {phase.kind === 'pick' && (
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <p className="font-headline text-lg font-bold text-ink">Pick up to {plural(phase.left, 'page')}</p>
              <p className="text-sm text-ink-muted">Free without an account. Tap Text or Diagram to change how a page is used.</p>
            </div>
            <div className="grid max-h-80 grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4">
              {phase.pages.map((p) => {
                const on = picked.has(p.pageIndex)
                const full = !on && picked.size >= phase.left
                return (
                  <div key={p.pageIndex} className={cn('flex flex-col gap-1.5 rounded-xl border p-1.5 transition', on ? 'border-accent bg-accent-soft/40' : 'border-line', full && 'opacity-50')}>
                    <button
                      type="button"
                      disabled={full}
                      aria-pressed={on}
                      aria-label={`Page ${p.pageIndex + 1}`}
                      onClick={() => setPicked((s) => { const n = new Set(s); if (n.has(p.pageIndex)) n.delete(p.pageIndex); else n.add(p.pageIndex); return n })}
                      className="relative overflow-hidden rounded-lg border border-line bg-paper"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.dataUrl} alt="" className="block aspect-[4/3] w-full object-cover" />
                      {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-surface"><Check className="h-3 w-3" aria-hidden /></span>}
                    </button>
                    <div className="flex items-center justify-between gap-1 px-0.5 text-[11px]">
                      <span className="text-ink-muted">p. {p.pageIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => setPhase({ ...phase, pages: phase.pages.map((x) => (x.pageIndex === p.pageIndex ? { ...x, type: x.type === 'diagram' ? 'flashcard' : 'diagram' } : x)) })}
                        className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold', p.type === 'diagram' ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-ink')}
                      >
                        {p.type === 'diagram' ? <ImageIcon className="h-3 w-3" aria-hidden /> : <Text className="h-3 w-3" aria-hidden />}
                        {p.type === 'diagram' ? 'Diagram' : 'Text'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
              <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4" aria-hidden />Cancel</Button>
              <Button disabled={!picked.size} onClick={() => generate(phase.fileName, phase.pages.filter((p) => picked.has(p.pageIndex)), phase.pass)}>
                Make {plural(picked.size, 'page')} into cards
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {phase.kind === 'generating' && (
          <div className="flex flex-1 flex-col gap-3">
            <p className="font-headline text-lg font-bold text-ink">Making your cards…</p>
            <ul className="flex flex-col gap-2">
              {phase.pages.map((p) => {
                const s = phase.status[p.pageIndex]
                return (
                  <li key={p.pageIndex} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt="" className="h-10 w-14 shrink-0 rounded-md border border-line object-cover" />
                    <span className="flex-1 text-sm text-ink">Page {p.pageIndex + 1} · {p.type === 'diagram' ? 'diagram quiz' : 'flashcards'}</span>
                    {s === 'pending' ? <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-label="Working" />
                      : s === 'done' ? <Check className="h-4 w-4 text-good" aria-label="Done" />
                      : <X className="h-4 w-4 text-bad" aria-label="Failed" />}
                  </li>
                )
              })}
            </ul>
            {waking && <p className="text-sm text-ink-muted">The study server is waking up. This takes a few seconds the first time.</p>}
          </div>
        )}

        {phase.kind === 'results' && (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-headline text-lg font-bold text-ink">{plural(cardCount(phase.results), 'card')} from {plural(new Set(phase.results.map((r) => r.pageIndex)).size, 'page')}</p>
              {phase.sample && <span className="text-[13px] text-ink-muted">Sample lecture</span>}
            </div>
            {phase.note && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{phase.note}</p>}
            <div className="flex max-h-[26rem] flex-col gap-2.5 overflow-y-auto pr-1">
              {phase.results.flatMap((r) => r.type === 'flashcard'
                ? (r.cards ?? []).map((c, i) => <RevealCard key={`${r.pageIndex}-${i}`} front={c.front} back={c.back} page={r.pageIndex + 1} />)
                : [(
                  <div key={`d-${r.pageIndex}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">Diagram · tap a box to check</span>
                      <PageTag page={r.pageIndex + 1} />
                    </div>
                    <CoveredDiagram
                      mode="reveal"
                      labels={r.labels ?? []}
                      // eslint-disable-next-line @next/next/no-img-element
                      image={phase.sample ? <div ref={sampleSvg}><CellDiagram className="block h-auto w-full" /></div> : <img src={r.imageDataUrl} alt="Your diagram" className="block h-auto w-full" />}
                    />
                  </div>
                )]
              )}
            </div>
            <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-muted">Cards stay in this browser until you save them.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden />Start over</Button>
                <Button loading={saving} onClick={() => save(phase.results, phase.fileName, phase.sample)}>
                  Save my cards
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase.kind === 'blocked' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="font-headline text-xl font-bold text-ink">{phase.title}</p>
            <p className="max-w-sm text-ink-muted">{phase.message}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Link href={SIGNUP} className={buttonClass('primary', 'md')}>Sign up free</Link>
              <Button variant="secondary" onClick={() => setPhase({ kind: 'results', fileName: SAMPLE_FILE, results: SAMPLE_RESULTS, sample: true })}>Try the sample instead</Button>
            </div>
            <button type="button" onClick={reset} className="mt-1 text-sm text-ink-muted underline-offset-2 hover:underline">Back</button>
          </div>
        )}
      </div>
      <div ref={host} className="flex justify-center empty:hidden" />
    </div>
  )
}

function RevealCard({ front, back, page }: { front: string; back: string; page: number }) {
  const [open, setOpen] = useState(false)
  return (
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full flex-col gap-2 rounded-2xl border border-line bg-paper p-4 text-left transition hover:border-ink-muted/50">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">Question</span>
        <PageTag page={page} />
      </span>
      <span className="font-headline text-[15px] font-bold leading-snug text-ink">{front}</span>
      {open ? <span className="border-t border-dashed border-line pt-2 text-sm text-ink-muted">{back}</span> : <span className="text-xs text-ink-muted">Tap to see the answer</span>}
    </button>
  )
}
