import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Card } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function resolveCardOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cardId: string,
  userId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: card } = await (supabase.from('cards') as any)
    .select('id, set_id, sets!inner(owner_id)')
    .eq('id', cardId)
    .single()

  if (!card) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerIds = (card as any).sets
  const ownerId = Array.isArray(ownerIds) ? ownerIds[0]?.owner_id : ownerIds?.owner_id
  if (ownerId !== userId) return null
  return card as Card
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const card = await resolveCardOwner(supabase, id, user.id)
  if (!card) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.front !== undefined) updates.front = body.front?.trim() ?? null
  if (body.back !== undefined) updates.back = body.back?.trim() ?? null
  if (body.image_url !== undefined) updates.image_url = body.image_url
  if (body.labels !== undefined) updates.labels = body.labels
  if (body.position !== undefined) updates.position = body.position

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('cards') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Card)
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const card = await resolveCardOwner(supabase, id, user.id)
  if (!card) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('cards') as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
