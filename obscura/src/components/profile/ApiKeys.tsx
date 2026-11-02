'use client'

import { useEffect, useState } from 'react'
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
import Icon from '@/components/ui/Icon'

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
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
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

export default function ApiKeys() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink">Your own API keys</h2>

      <p className="text-ink-muted">
        Without a key you get a daily allowance of pages to turn into cards. With a key from either
        provider there&apos;s no limit, and usage bills to that account. A new key needs credits on its
        account first. With both saved, Anthropic runs first and OpenAI takes over if it fails.
      </p>

      <div className="flex flex-col gap-4">
        {PROVIDER_ORDER.map((provider) => (
          <ApiKeySection key={provider} provider={provider} />
        ))}
      </div>

      <p className="text-[13px] text-ink-muted">
        Keys stay in this browser and go only to our generation endpoint. They&apos;re never saved
        to our database, so you&apos;ll need to add them again on another device.
      </p>
    </section>
  )
}

