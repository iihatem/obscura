'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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
          ? 'The database is currently paused (free tier). Visit the Supabase dashboard to resume it, then try again.'
          : error.message
      )
      setLoading(false)
    } else {
      router.push(redirect ?? '/library')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#E6E6E2] flex flex-col">
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/frog.svg" alt="Obscura logo" className="w-7 h-7 rounded-md" />
          <span className="text-xl font-black text-[#2A3741] tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
            Obscura
          </span>
        </Link>
        <Link href="/signup" className="text-sm text-[#4A5558] hover:text-[#2A3741] transition-colors">
          Create account →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[#2A3741] mb-2" style={{ fontFamily: 'var(--font-manrope)' }}>
              Welcome back
            </h1>
            <p className="text-[#4A5558] text-sm">Sign in to continue studying</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl p-8 border border-[#D8D8D4] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2A3741] via-[#60888A] to-[#2A3741]" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#4A5558] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full bg-[#EAEAE6] border-none rounded-lg px-4 py-3 text-sm text-[#1E2528] placeholder:text-[#6A7A7C] focus:outline-none focus:ring-2 focus:ring-[#60888A]/20 transition-all"
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#4A5558] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#EAEAE6] border-none rounded-lg px-4 py-3 text-sm text-[#1E2528] placeholder:text-[#6A7A7C] focus:outline-none focus:ring-2 focus:ring-[#60888A]/20 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full scholar-gradient text-[#E6E6E2] py-3 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-1"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#4A5558] mt-6">
            No account?{' '}
            <Link href="/signup" className="text-[#60888A] font-bold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
