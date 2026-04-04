'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
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
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/library')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-black text-[#051125] tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
          Obscura AI
        </Link>
        <Link href="/signup" className="text-sm text-[#45474d] hover:text-[#051125] transition-colors">
          Create account →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[#051125] mb-2" style={{ fontFamily: 'var(--font-manrope)' }}>
              Welcome back
            </h1>
            <p className="text-[#45474d] text-sm">Sign in to continue studying</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl p-8 border border-[#e7e8e9] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#051125] via-[#006972] to-[#051125]" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 transition-all"
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full scholar-gradient text-white py-3 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-1"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#45474d] mt-6">
            No account?{' '}
            <Link href="/signup" className="text-[#006972] font-bold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
