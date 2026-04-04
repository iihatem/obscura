import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StudySession } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { set_id, mode } = body

  if (!set_id || !mode) {
    return NextResponse.json({ error: 'set_id and mode are required' }, { status: 400 })
  }
  if (!['flashcard', 'diagram', 'mixed'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  // Verify the user has access to this set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: set } = await (supabase.from('sets') as any)
    .select('id, owner_id, visibility')
    .eq('id', set_id)
    .single()

  if (!set) return NextResponse.json({ error: 'Set not found' }, { status: 404 })
  if (set.owner_id !== user.id && set.visibility === 'private') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('study_sessions') as any)
    .insert({ user_id: user.id, set_id, mode })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as StudySession, { status: 201 })
}
