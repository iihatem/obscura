import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetGrid from '@/components/sets/SetGrid'
import type { Set } from '@/types'

export default async function LibraryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await (supabase.from('sets') as any)
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const sets: Set[] = data ?? []

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Your library</h1>
        <Link
          href="/sets/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New set
        </Link>
      </div>

      <SetGrid sets={sets} />
    </div>
  )
}
