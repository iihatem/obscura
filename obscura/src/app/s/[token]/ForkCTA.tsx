'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, withColdStartRetry } from '@/lib/api'
import Icon from '@/components/ui/Icon'
import { buttonClass } from '@/components/ui/Button'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function ForkCTA({ setId, token }: { setId: string; token: string }) {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [forking, setForking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
    })
  }, [])

  async function handleFork() {
    setForking(true)
    setError('')
    try {
      // The token proves the link was shared with us; a link set can't be copied by id alone.
      const res = await withColdStartRetry(() =>
        apiFetch(`/sets/${setId}/fork?token=${encodeURIComponent(token)}`, { method: 'POST' })
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail ?? "Couldn't copy this set. Please try again.")
      }
      const { new_set_id } = await res.json()
      router.push(`/sets/${new_set_id}`)
    } catch (err) {
      setError((err as Error).message)
      setForking(false)
    }
  }

  // still checking auth
  if (authed === null) {
    return <div className="h-12 w-52 animate-pulse rounded-full bg-paper-2" />
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center gap-3">
        <a href={`/signup?redirect=${encodeURIComponent(`/s/${token}`)}`} className={buttonClass('primary', 'lg')}>
          <Icon name="library_add" size={18} />
          Sign up to copy and study
        </a>
        <p className="text-sm text-ink-muted">
          Already have an account?{' '}
          <a href={`/login?redirect=${encodeURIComponent(`/s/${token}`)}`} className="font-semibold text-accent-ink hover:underline">
            Sign in
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={handleFork} disabled={forking} className={buttonClass('primary', 'lg')}>
        {forking ? <Spinner /> : <Icon name="library_add" size={18} />}
        {forking ? 'Copying…' : 'Copy to my library'}
      </button>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  )
}
