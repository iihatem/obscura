import { NextResponse } from 'next/server'

// Legacy handler — redirects to /api/image/[...path] so old bookmarked URLs still work.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }
  return NextResponse.redirect(new URL(`/api/image/${path}`, request.url), 301)
}
