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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch for Supabase SDK generic inference
  const { data } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single()

  const profile: Profile | null = data ?? null

  return <AppShell profile={profile}>{children}</AppShell>
}
