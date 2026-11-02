'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buttonClass } from '@/components/ui/Button'

/** Signed-in visitors get a way back to their library instead of sign-up prompts. */
export default function HeaderActions() {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setSignedIn(!!data.session)).catch(() => {})
  }, [])

  if (signedIn) {
    return <Link href="/library" className={buttonClass('primary', 'sm')}>Go to your library</Link>
  }
  return (
    <>
      <Link href="/login" className="hidden text-sm font-medium text-ink-muted hover:text-ink sm:inline">Sign in</Link>
      <a href="#try" className={buttonClass('primary', 'sm')}>Make my first quiz</a>
    </>
  )
}
