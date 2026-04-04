import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ResultEntry {
  card_id: string
  grade: 'correct' | 'close' | 'wrong' | 'empty'
  time_taken_ms: number
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { session_id, results } = body as { session_id: string; results: ResultEntry[] }

  if (!session_id || !Array.isArray(results)) {
    return NextResponse.json({ error: 'session_id and results are required' }, { status: 400 })
  }

  // Verify the session belongs to this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (supabase.from('study_sessions') as any)
    .select('id, user_id')
    .eq('id', session_id)
    .single()

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = results.map((r) => ({
    session_id,
    card_id: r.card_id,
    grade: r.grade,
    time_taken_ms: r.time_taken_ms ?? null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase.from('card_results') as any).insert(rows)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Mark session complete
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_sessions') as any)
    .update({ completed_at: new Date().toISOString() })
    .eq('id', session_id)

  return new NextResponse(null, { status: 204 })
}
