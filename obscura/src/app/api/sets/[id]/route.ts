import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Set, Card } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function requireOwner(supabase: Awaited<ReturnType<typeof createClient>>, setId: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: set } = await (supabase.from('sets') as any)
    .select('owner_id')
    .eq('id', setId)
    .single()
  if (!set) return null
  if (set.owner_id !== userId) return null
  return set
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: set, error: setError } = await (supabase.from('sets') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (setError || !set) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (set.owner_id !== user.id && set.visibility === 'private') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cards } = await (supabase.from('cards') as any)
    .select('*')
    .eq('set_id', id)
    .order('position', { ascending: true })

  return NextResponse.json({ set: set as Set, cards: (cards ?? []) as Card[] })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const owned = await requireOwner(supabase, id, user.id)
  if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { title, description, subject, visibility } = body

  if (title !== undefined && !title?.trim()) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title.trim()
  if (description !== undefined) updates.description = description?.trim() ?? null
  if (subject !== undefined) updates.subject = subject?.trim() ?? null
  if (visibility !== undefined) updates.visibility = visibility

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sets') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Set)
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const owned = await requireOwner(supabase, id, user.id)
  if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('sets') as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
