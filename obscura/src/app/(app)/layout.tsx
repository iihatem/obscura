import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile — cast through unknown to avoid SDK generic inference issues
  const { data } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single()

  const profile: Profile | null = data ?? null

  return <AppShell profile={profile}>{children}</AppShell>
}
