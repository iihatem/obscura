'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'

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
      const res = await apiFetch(`/sets/${setId}/fork`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to copy set')
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
          href={`/login?redirect=/s/${token}`}
          className="inline-flex items-center gap-2 px-8 py-3 scholar-gradient text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#051125]/20"
        >
          <span className="material-symbols-outlined text-[18px]">login</span>
          Sign in to copy
        </a>
        <p className="text-xs text-[#75777d]">Free account required</p>
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
        {forking ? <Spinner /> : <span className="material-symbols-outlined text-[18px]">library_add</span>}
        {forking ? 'Copying…' : 'Copy to my library'}
      </button>
      {error && <p className="text-xs text-[#ba1a1a]">{error}</p>}
    </div>
  )
}
