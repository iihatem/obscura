import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { Label } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/** Detect image format from magic bytes — never trust the caller's claimed type alone */
function detectMime(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const bytes = Buffer.from(base64.slice(0, 16), 'base64')
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp'
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  return 'image/jpeg'
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { imageBase64, setId } = body as { imageBase64: string; setId: string }

  if (!imageBase64 || !setId) {
    return NextResponse.json({ error: 'imageBase64 and setId are required' }, { status: 400 })
  }

  const mimeType = detectMime(imageBase64)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system:
      'You analyze educational diagrams and locate all visible text labels. Return ONLY a raw JSON array, no markdown. Each element: {label, x, y, width, height} as percentages of image dimensions. x,y = top-left of bounding box. Add generous padding (1-2%) so boxes fully cover labels. Include every visible text label.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Identify and return all text labels in this diagram as JSON.',
          },
        ],
      },
    ],
  })

  const raw = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  let labels: Label[] = []
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    labels = JSON.parse(cleaned)
    if (!Array.isArray(labels)) labels = []
  } catch {
    labels = []
  }

  return NextResponse.json({ labels })
}
