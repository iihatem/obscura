import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
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
    },
  })
}
