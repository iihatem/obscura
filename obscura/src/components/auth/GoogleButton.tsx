'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GoogleButtonProps {
  /** Where to land after sign-in — already passed through safeRedirect. */
  redirect: string
  onError: (message: string) => void
}

/**
 * "Continue with Google", shown only once the provider is switched on in
 * Supabase. Before that, Supabase answers the sign-in redirect with a bare
 * JSON error page, so the button stays hidden rather than lead there.
 */
export default function GoogleButton({ redirect, onError }: GoogleButtonProps) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => setEnabled(Boolean(settings?.external?.google)))
      .catch(() => {})
  }, [])

  async function handleClick() {
    setLoading(true)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    })
    // On success the browser is already leaving for Google.
    if (error) {
      onError("Couldn't start Google sign-in. Please try again.")
      setLoading(false)
    }
  }

  if (!enabled) return null

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#D8D8D4] bg-white py-3 text-sm font-bold text-[#1E2528] hover:bg-[#F4F4F1] active:scale-95 transition-all disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {loading ? 'Redirecting to Google…' : 'Continue with Google'}
      </button>
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#6A7A7C]">
        <span className="h-px flex-1 bg-[#D8D8D4]" />
        or
        <span className="h-px flex-1 bg-[#D8D8D4]" />
      </div>
    </>
  )
}
