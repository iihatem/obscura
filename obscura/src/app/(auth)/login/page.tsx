'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeRedirect } from '@/lib/utils'
import GoogleButton from '@/components/auth/GoogleButton'

const CALLBACK_ERRORS: Record<string, string> = {
  auth_callback_failed:
    'That sign-in link has expired or was already used. Sign in below, or sign up again to get a new link.',
  oauth_cancelled: 'Google sign-in was cancelled.',
  oauth_failed: "Google sign-in didn't go through. Please try again.",
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(CALLBACK_ERRORS[searchParams.get('error') ?? ''] ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message.toLowerCase()
      const isPaused =
        msg.includes('project is paused') ||
        msg.includes('503') ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror')
      setError(
        isPaused
          ? "We can't reach the server right now. Please try again in a minute."
          : error.message
      )
      setLoading(false)
    } else {
      router.push(redirect)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-paper-2 flex flex-col">
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/frog.svg" alt="Obscura logo" className="w-7 h-7 rounded-md" />
          <span className="font-headline text-xl font-black text-ink tracking-tight">
            Obscura
          </span>
        </Link>
        <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-sm text-ink-muted hover:text-ink transition-colors">
          Create account →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-extrabold text-ink mb-2">
              Welcome back
            </h1>
            <p className="text-ink-muted text-sm">Sign in to continue studying</p>
          </div>

          {/* Card */}
          <div className="bg-surface rounded-xl p-8 border border-line shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink via-accent to-ink" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <GoogleButton redirect={redirect} onError={setError} />
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full bg-paper-2 border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full bg-paper-2 border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-bad bg-bad-soft rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-paper-2 py-3 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-1"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-ink-muted mt-6">
            No account?{' '}
            <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-accent font-bold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
