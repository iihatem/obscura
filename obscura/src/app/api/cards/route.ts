import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Card } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { set_id, type, front, back, image_url, labels } = body

  if (!set_id || !type) {
    return NextResponse.json({ error: 'set_id and type are required' }, { status: 400 })
  }
  if (!['flashcard', 'diagram'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: set } = await (supabase.from('sets') as any)
    .select('owner_id')
    .eq('id', set_id)
    .single()

  if (!set || set.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Compute next position
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastCard } = await (supabase.from('cards') as any)
    .select('position')
    .eq('set_id', set_id)
    .eq('type', type)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = lastCard ? lastCard.position + 1 : 0

  const insert: Record<string, unknown> = { set_id, type, position }
  if (type === 'flashcard') {
    if (!front?.trim() || !back?.trim()) {
      return NextResponse.json({ error: 'Front and back are required' }, { status: 400 })
    }
    insert.front = front.trim()
    insert.back = back.trim()
  } else {
    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required for diagram cards' }, { status: 400 })
    }
    insert.image_url = image_url
    insert.labels = labels ?? []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('cards') as any)
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Card, { status: 201 })
}
