import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export default async function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(redirectTo)
  }

  return <>{children}</>
}
