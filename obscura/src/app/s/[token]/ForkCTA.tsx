'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, withColdStartRetry } from '@/lib/api'

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
    return (
      <div className="h-12 w-48 rounded-xl bg-[#e7e8e9] animate-pulse" />
    )
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center gap-3">
        <a
          href={`/signup?redirect=${encodeURIComponent(`/s/${token}`)}`}
          className="inline-flex items-center gap-2 px-8 py-3 scholar-gradient text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#051125]/20"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>library_add</span>
          Sign up free to copy
        </a>
        <p className="text-xs text-[#75777d]">
          Already have an account?{' '}
          <a href={`/login?redirect=${encodeURIComponent(`/s/${token}`)}`} className="font-bold text-[#006972] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleFork}
        disabled={forking}
        className="inline-flex items-center gap-2 px-8 py-3 scholar-gradient text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#051125]/20 disabled:opacity-60 disabled:pointer-events-none"
      >
        {forking ? <Spinner /> : <span className="material-symbols-outlined text-[18px]" aria-hidden>library_add</span>}
        {forking ? 'Copying…' : 'Copy to my library'}
      </button>
      {error && <p className="text-xs text-[#ba1a1a]">{error}</p>}
    </div>
  )
}
