'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

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

    // If the user object is returned and confirmed, upsert the profile row
    // (the DB trigger handles it too, but this is a belt-and-suspenders fallback)
    if (data.user && data.session) {
      // DB trigger (handle_new_user) creates the profile row on insert;
      // this is a fallback in case the trigger hasn't been applied yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).upsert({
        id: data.user.id,
        display_name: displayName,
      })
      router.push('/library')
      router.refresh()
    } else {
      // Email confirmation required
      setCheckEmail(true)
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <header className="px-8 py-6">
          <span className="text-lg font-semibold tracking-tight text-stone-900">Obscura</span>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm text-center">
            <div className="text-3xl mb-4">✉️</div>
            <h1 className="text-xl font-semibold text-stone-900 mb-2">Check your email</h1>
            <p className="text-stone-500 text-sm">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
              account.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="px-8 py-6">
        <span className="text-lg font-semibold tracking-tight text-stone-900">Obscura</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">Create an account</h1>
          <p className="text-stone-500 text-sm mb-6">Start building your study library</p>

          <Card padding="lg">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Display name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="e.g. Alex"
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" loading={loading} className="w-full mt-1">
                Create account
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-stone-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-stone-900 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
