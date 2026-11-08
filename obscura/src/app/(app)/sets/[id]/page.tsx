import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetDetail from '@/components/sets/SetDetail'
import ExamPlanPanel from '@/components/plan/ExamPlanPanel'
import { fetchExamPlans, fetchGradeHistory } from '@/lib/examPlans'
import type { ReactNode } from 'react'
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
  const isOwner = typedSet.owner_id === user.id

  // The owner's exam plan. Left out when plans aren't switched on yet.
  let plan: ReactNode = null
  if (isOwner && cards.length) {
    const [plans, history] = await Promise.all([fetchExamPlans(supabase, user.id, id), fetchGradeHistory(supabase, user.id, [id])])
    if (plans) plan = <ExamPlanPanel setId={id} cardIds={cards.map((c) => c.id)} history={history} plan={plans[0] ?? null} />
  }

  return (
    <SetDetail
      initialSet={typedSet}
      initialCards={cards}
      isOwner={isOwner}
      userId={user.id}
      plan={plan}
    />
  )
}
