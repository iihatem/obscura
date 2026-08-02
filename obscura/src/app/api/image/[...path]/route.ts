import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function detectMime(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf.slice(0, 4))
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg'
  if (b[0] === 0x52 && b[1] === 0x49) return 'image/webp'
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif'
  return 'image/jpeg'
}

/** `%` and `_` are LIKE wildcards — a storage path must match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * This proxy reads Storage with the service role, so it has to apply the access
 * rules the bucket itself can't. Mirrors the `cards_select` RLS policy: you may
 * read an image if you uploaded it, or if it belongs to a card in a set that is
 * public or link-shared.
 *
 * Link-shared sets are readable without presenting the token, matching how the
 * rest of the app treats them — the token gates discovery, not the assets.
 */
async function canRead(path: string, viewerId: string | null): Promise<boolean> {
  // Uploads are namespaced by uploader (enforced in /api/upload/image), so the
  // owner is recognisable from the path alone — no query needed.
  if (viewerId && path.startsWith(`${viewerId}/`)) return true

  const admin = getAdminClient()

  // One image can back several cards: forking copies image_url as-is into a new
  // private set (see routers/sets.py). So ask whether *any* card referencing
  // this file sits in a set the viewer may read, rather than inspecting one
  // arbitrary row — otherwise a fork's private row could mask a public original.
  const matchingCards = () =>
    admin
      .from('cards')
      .select('id, sets!inner(visibility, owner_id)')
      .like('image_url', `%/card-images/${escapeLike(path)}`)

  const { data: shared } = await matchingCards()
    .in('sets.visibility', ['public', 'link'])
    .limit(1)
  if (shared && shared.length > 0) return true

  if (viewerId) {
    const { data: owned } = await matchingCards()
      .eq('sets.owner_id', viewerId)
      .limit(1)
    if (owned && owned.length > 0) return true
  }

  return false
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const path = segments.join('/')

  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 404 rather than 403: a distinct "forbidden" would confirm the file exists.
  if (!(await canRead(path, user?.id ?? null))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin.storage.from('card-images').download(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  const arrayBuffer = await data.arrayBuffer()
  const contentType = detectMime(arrayBuffer)

  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      // The response now depends on who is asking.
      Vary: 'Cookie',
    },
  })
}
