'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

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
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user && data.session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).upsert({
        id: data.user.id,
        display_name: displayName,
      })
      router.push('/library')
      router.refresh()
    } else {
      setCheckEmail(true)
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
        <header className="px-8 py-5">
          <Link href="/" className="text-xl font-black text-[#051125] tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
            Obscura AI
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-[#006972]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[#006972] text-3xl">mark_email_read</span>
            </div>
            <h1 className="text-2xl font-bold text-[#051125] mb-2" style={{ fontFamily: 'var(--font-manrope)' }}>
              Check your email
            </h1>
            <p className="text-[#45474d] text-sm">
              We sent a confirmation link to <strong className="text-[#051125]">{email}</strong>.
              Click it to activate your account.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-black text-[#051125] tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
          Obscura AI
        </Link>
        <Link href="/login" className="text-sm text-[#45474d] hover:text-[#051125] transition-colors">
          Sign in →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[#051125] mb-2" style={{ fontFamily: 'var(--font-manrope)' }}>
              Create an account
            </h1>
            <p className="text-[#45474d] text-sm">Start curating your study library today</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl p-8 border border-[#e7e8e9] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#051125] via-[#006972] to-[#051125]" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#45474d] mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  placeholder="e.g. Alex"
                  required
                  className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 transition-all"
                />
              </div>
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
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full bg-[#f3f4f5] border-none rounded-lg px-4 py-3 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20 transition-all"
                  placeholder="Min 8 characters"
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
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#45474d] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#006972] font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
