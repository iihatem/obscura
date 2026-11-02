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
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Nav */}
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/frog.svg" alt="Obscura logo" className="w-7 h-7 rounded-md" />
          <span className="font-headline text-lg font-extrabold tracking-tight text-ink">
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
            <h1 className="mb-1 text-[28px] font-extrabold text-ink">
              Welcome back
            </h1>
            <p className="text-ink-muted">
              {redirect === '/claim' ? 'Sign in and your new cards go straight into your library.' : 'Sign in to keep studying.'}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <GoogleButton redirect={redirect} onError={setError} />
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-muted/80 transition-[border-color,box-shadow] focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-muted/80 transition-[border-color,box-shadow] focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-bad bg-bad-soft rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-on-ink transition hover:bg-ink/88 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-ink-muted mt-6">
            No account?{' '}
            <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-accent-ink hover:underline">
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
