'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, COLD_START_BACKOFF } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  PROVIDERS,
  PROVIDER_ORDER,
  clearApiKey,
  getApiKey,
  isValidApiKeyFormat,
  maskApiKey,
  setApiKey,
  type Provider,
} from '@/lib/apiKey'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Icon from '@/components/ui/Icon'

interface ProfileData {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string
  sets_count: number
  cards_studied: number
}

export interface SessionHistoryItem {
  id: string
  set_id: string
  set_title: string
  mode: 'flashcard' | 'diagram' | 'mixed'
  completed_at: string
  total_cards: number
  score_pct: number
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-6 flex flex-col gap-3">
      <Icon name={icon} size={28} className="text-accent" />
      <div>
        <p className="font-headline text-3xl font-extrabold text-ink">
          {value}
        </p>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mt-1">{label}</p>
      </div>
    </div>
  )
}

const modeLabel: Record<string, string> = {
  flashcard: 'Flashcards',
  diagram: 'Diagrams',
  mixed: 'Mixed',
}

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

function ApiKeySection({ provider }: { provider: Provider }) {
  const { toast } = useToast()
  const { label, prefix, links } = PROVIDERS[provider]
  const [saved, setSaved] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setSaved(getApiKey(provider))
  }, [provider])

  function handleSave() {
    const trimmed = draft.trim()
    if (!isValidApiKeyFormat(provider, trimmed)) {
      toast(`${label} keys start with ${prefix}`, 'error')
      return
    }
    setApiKey(provider, trimmed)
    setSaved(trimmed)
    setDraft('')
    setEditing(false)
    toast(`${label} key saved — generations now bill to your own account`)
  }

  function handleRemove() {
    clearApiKey(provider)
    setSaved(null)
    setDraft('')
    setEditing(false)
    toast(`${label} key removed`)
  }

  return (
    <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-headline text-sm font-extrabold text-ink">
          {label}
        </h4>
        <div className="flex items-center gap-3 text-xs font-bold">
          <a
            href={links.keys}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            Get a key
          </a>
          <a
            href={links.billing}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            Buy credits
          </a>
          <a
            href={links.pricing}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-muted underline underline-offset-2"
          >
            Pricing
          </a>
        </div>
      </div>

      {saved && !editing ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="check_circle" size={18} className="text-good" />
            <code className="text-sm font-mono text-ink truncate">
              {maskApiKey(saved)}
            </code>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setEditing(true); setDraft('') }}
              className="h-8 px-4 rounded-lg border border-line text-xs font-bold text-ink-muted hover:bg-paper transition-colors"
            >
              Replace
            </button>
            <button
              onClick={handleRemove}
              className="h-8 px-4 rounded-lg border border-line text-xs font-bold text-bad hover:bg-bad-soft transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`${prefix}...`}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg bg-paper border-none px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape' && saved) setEditing(false)
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="h-8 px-4 rounded-lg bg-ink text-on-ink text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Save key
            </button>
            {saved && (
              <button
                onClick={() => setEditing(false)}
                className="h-8 px-4 rounded-lg border border-line text-xs font-bold text-ink-muted hover:bg-paper transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ApiKeys() {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted">
        Your API keys
      </h3>

      <p className="text-sm text-ink-muted leading-relaxed">
        Without a key you get a shared daily allowance of AI generations. Add a key from either
        provider to generate without limits — usage bills to that account instead. A new key needs
        credits on its account before it will work. With both saved, Anthropic runs first and
        OpenAI covers it if that call fails.
      </p>

      <div className="flex flex-col gap-4">
        {PROVIDER_ORDER.map((provider) => (
          <ApiKeySection key={provider} provider={provider} />
        ))}
      </div>

      <p className="text-xs text-ink-muted leading-relaxed">
        Stored only in this browser and sent directly to our generation endpoint.
        They never touch our database, and you&apos;ll need to re-enter them on other devices.
      </p>
    </section>
  )
}

export default function ProfilePage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [waking, setWaking] = useState(false)
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  // The API is a Hugging Face Space that sleeps when idle and answers with an
  // HTML holding page for ~25s while it wakes. Retry through that on its own —
  // an unattended failure here used to leave the page rendering nothing at all.
  const load = useCallback(async (attempt = 0) => {
    setLoading(true)
    setLoadError(null)
    setWaking(attempt > 0)
    try {
      const res = await apiFetch('/profile')
      if (!res.ok) throw new Error('Failed to load profile')
      const data: ProfileData = await res.json()
      setProfile(data)
      setDisplayName(data.display_name ?? '')
      setLoading(false)
      setWaking(false)

      // Non-critical: an empty history is a perfectly good page.
      apiFetch('/sessions/history')
        .then((r) => (r.ok ? r.json() : []))
        .then((history: SessionHistoryItem[]) => setSessions(history))
        .catch(() => {})
    } catch (err) {
      const wait = COLD_START_BACKOFF[attempt]
      if (wait !== undefined) {
        retryTimer.current = setTimeout(() => load(attempt + 1), wait)
        return // stay in the loading state — a retry is already queued
      }
      setLoading(false)
      setWaking(false)
      setLoadError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current) }
  }, [load])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      const res = await apiFetch('/profile', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const updated = await res.json()
      setProfile((p) => p ? { ...p, display_name: updated.display_name } : p)
      setEditing(false)
      toast('Profile updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const initials = (profile?.display_name ?? profile?.email ?? '?')
    .slice(0, 2)
    .toUpperCase()

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-10 py-4 sm:py-8">
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        {waking && (
          <p className="text-xs text-ink-muted flex items-center gap-2">
            <Icon name="progress_activity" size={16} className="animate-spin" />
            Waking the study server — this takes a few seconds after it&apos;s been idle.
          </p>
        )}
        {/* Keys live in this browser, not on the server — they work while it's asleep. */}
        <ApiKeys />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-4 sm:py-8">
        <div className="bg-surface rounded-xl border border-line p-8 flex flex-col items-center text-center gap-3">
          <Icon name="cloud_off" size={32} className="text-warn" />
          <h2
            className="font-headline text-xl font-extrabold text-ink"
          >
            Couldn&apos;t reach the study server
          </h2>
          <p className="text-sm text-ink-muted max-w-sm">
            {loadError ?? 'Something went wrong loading your profile.'} Your sets and cards are
            safe — this only affects the stats on this page.
          </p>
          <button
            onClick={() => load()}
            className="mt-2 h-9 px-5 rounded-lg bg-ink text-on-ink text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
        <div className="mt-10">
          <ApiKeys />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-4 sm:py-8">
      {/* Header */}
      <section className="space-y-2">
        <h2
          className="font-headline text-4xl font-extrabold tracking-tight text-ink"
        >
          Profile
        </h2>
        <p className="text-ink-muted">Manage your account and view your study stats.</p>
      </section>

      {/* Identity card */}
      <div className="bg-surface rounded-xl border border-line p-6 flex items-start gap-5">
        {/* Avatar */}
        <div className="h-16 w-16 rounded-full bg-ink flex items-center justify-center shrink-0">
          <span className="font-headline text-xl font-black text-on-ink">
            {initials}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  className="w-full max-w-xs rounded-lg bg-paper border-none px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Your name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') { setEditing(false); setDisplayName(profile.display_name ?? '') }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-4 rounded-lg bg-ink text-on-ink text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setDisplayName(profile.display_name ?? '') }}
                  className="h-8 px-4 rounded-lg border border-line text-xs font-bold text-ink-muted hover:bg-paper transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p
                  className="font-headline text-lg font-extrabold text-ink"
                >
                  {profile.display_name || <span className="text-ink-muted font-medium italic">No display name</span>}
                </p>
                <p className="text-sm text-ink-muted mt-0.5">{profile.email}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-ink hover:bg-paper-2 transition-colors shrink-0"
              >
                <Icon name="edit" size={14} />
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted">Study stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon="layers" label="Sets created" value={profile.sets_count} />
          <StatCard icon="school" label="Cards studied" value={profile.cards_studied} />
        </div>
      </section>

      {/* API keys */}
      <ApiKeys />

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted">Recent sessions</h3>
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-surface rounded-xl border border-line px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-headline font-bold text-sm text-ink truncate">
                    {s.set_title}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {modeLabel[s.mode]} · {s.total_cards} cards · {relativeDate(s.completed_at)}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={cn('font-headline text-lg font-extrabold', s.score_pct >= 80 ? 'text-good' : s.score_pct >= 50 ? 'text-warn' : 'text-bad')}
                  >
                    {s.score_pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
