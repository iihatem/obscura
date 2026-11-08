import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudySession from '@/components/study/StudySession'
import TodayStudy from '@/components/plan/TodayStudy'
import { fetchExamPlans, fetchGradeHistory } from '@/lib/examPlans'
import type { Set, Card } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ plan?: string }>
}

export default async function StudyPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { plan: planParam } = await searchParams
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

  // ?plan=today studies just today's cards from the student's exam plan.
  if (planParam === 'today') {
    const [plan] = (await fetchExamPlans(supabase, user.id, id)) ?? []
    if (!plan) redirect(`/sets/${id}/study`)
    const history = await fetchGradeHistory(supabase, user.id, [id])
    return <TodayStudy set={typedSet} cards={cards} plan={plan} history={history} />
  }

  return <StudySession set={typedSet} cards={cards} />
}
