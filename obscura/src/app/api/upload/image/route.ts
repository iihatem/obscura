import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { dataUrl: string; path: string }
  const { dataUrl, path } = body

  if (!dataUrl || !path) {
    return NextResponse.json({ error: 'dataUrl and path are required' }, { status: 400 })
  }

  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Decode the data URL: "data:<mime>;base64,<data>"
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx === -1) {
    return NextResponse.json({ error: 'Invalid dataUrl' }, { status: 400 })
  }
  const header = dataUrl.slice(0, commaIdx)          // "data:image/png;base64"
  const base64Data = dataUrl.slice(commaIdx + 1)     // the actual base64 string
  const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const buffer = Buffer.from(base64Data, 'base64')

  const admin = getAdminClient()
  const { error: uploadError } = await admin.storage
    .from('card-images')
    .upload(path, buffer, { contentType: mimeType, upsert: true })

  if (uploadError) {
    console.error('[upload/image] Supabase upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('card-images')
    .getPublicUrl(path)

  return NextResponse.json({ publicUrl })
}
