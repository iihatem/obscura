import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetDetail from '@/components/sets/SetDetail'
import type { Set, Card } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SetDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: set, error: setError } = await (supabase.from('sets') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (setError || !set) notFound()

  const typedSet = set as Set
  if (typedSet.owner_id !== user.id && typedSet.visibility === 'private') {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cardsData } = await (supabase.from('cards') as any)
    .select('*')
    .eq('set_id', id)
    .order('position', { ascending: true })

  const cards: Card[] = cardsData ?? []

  return (
    <SetDetail
      initialSet={typedSet}
      initialCards={cards}
      isOwner={typedSet.owner_id === user.id}
      userId={user.id}
    />
  )
}
