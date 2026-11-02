'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeRedirect } from '@/lib/utils'
import GoogleButton from '@/components/auth/GoogleButton'
import Icon from '@/components/ui/Icon'

const UNREACHABLE = "We can't reach the server right now. Please try again in a minute."

function isUnreachable(message: string): boolean {
  const msg = message.toLowerCase()
  return (
    msg.includes('project is paused') ||
    msg.includes('503') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror')
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  // Where the user was headed — e.g. a shared set they wanted to copy. Carried
  // through the confirmation email so they land back there, not on /library.
  const redirect = safeRedirect(useSearchParams().get('redirect'))
  const [resent, setResent] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  function confirmUrl() {
    return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`
  }

  async function handleResend() {
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: confirmUrl() },
    })
    if (resendError) setError(isUnreachable(resendError.message) ? UNREACHABLE : resendError.message)
    else setResent(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        // Without this the link falls back to the project's Site URL, which is
        // only right on a machine running the dev server.
        emailRedirectTo: confirmUrl(),
      },
    })

    if (signUpError) {
      setError(isUnreachable(signUpError.message) ? UNREACHABLE : signUpError.message)
      setLoading(false)
      return
    }

    if (data.user && data.session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).upsert({
        id: data.user.id,
        display_name: displayName,
      })
      router.push(redirect)
      router.refresh()
    } else {
      setCheckEmail(true)
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-paper-2 flex flex-col">
        <header className="px-8 py-5">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/frog.svg" alt="Obscura logo" className="w-7 h-7 rounded-md" />
            <span className="font-headline text-xl font-black text-ink tracking-tight">
              Obscura
            </span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="mark_email_read" size={30} className="text-accent" />
            </div>
            <h1 className="font-headline text-2xl font-bold text-ink mb-2">
              Check your email
            </h1>
            <p className="text-ink-muted text-sm">
              We sent a confirmation link to <strong className="text-ink">{email}</strong>.
              Click it to activate your account.
            </p>
            <p className="mt-6 text-sm text-ink-muted">
              No email after a few minutes? Check spam, or{' '}
              {resent ? (
                <span className="font-bold text-ink">we sent another one.</span>
              ) : (
                <button type="button" onClick={handleResend} className="text-accent font-bold hover:underline">
                  send it again
                </button>
              )}
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
            <p className="mt-3 text-sm text-ink-muted">
              Wrong address?{' '}
              <button
                type="button"
                onClick={() => { setCheckEmail(false); setResent(false); setError('') }}
                className="text-accent font-bold hover:underline"
              >
                Change it
              </button>
              {' · '}
              <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-accent font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    )
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
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-sm text-ink-muted hover:text-ink transition-colors">
          Sign in →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-extrabold text-ink mb-2">
              Create an account
            </h1>
            <p className="text-ink-muted text-sm">Start curating your study library today</p>
          </div>

          {/* Card */}
          <div className="bg-surface rounded-xl p-8 border border-line shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink via-accent to-ink" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <GoogleButton redirect={redirect} onError={setError} />
              <div>
                <label htmlFor="signup-name" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Display name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  placeholder="e.g. Alex"
                  required
                  className="w-full bg-paper-2 border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Email
                </label>
                <input
                  id="signup-email"
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
                <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full bg-paper-2 border-none rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="Min 8 characters"
                />
              </div>

              {error && (
                <p className="text-sm text-bad bg-bad-soft rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-paper-2 py-3 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-1"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-ink-muted mt-6">
            Already have an account?{' '}
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-accent font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
