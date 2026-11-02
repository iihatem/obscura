'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearAllDrafts } from '@/lib/drafts'
import Button from '@/components/ui/Button'

export default function SignOutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    await createClient().auth.signOut()
    await clearAllDrafts()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant="secondary" loading={busy} onClick={signOut}>
      {!busy && <LogOut className="h-4 w-4" aria-hidden />}
      Sign out
    </Button>
  )
}
