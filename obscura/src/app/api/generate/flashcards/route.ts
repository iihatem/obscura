import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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
    max_tokens: 4096,
    system:
      'You are a medical education assistant. Extract high-yield facts from this page and generate flashcard Q&A pairs. Return ONLY a raw JSON array, no markdown. Each element: {front: string, back: string}. Front should be a specific question. Back should be a concise answer. Generate between 3-8 cards per page depending on content density. Focus on facts a student would need to memorize.',
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
            text: 'Generate flashcard Q&A pairs from this page.',
          },
        ],
      },
    ],
  })

  const raw = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  let cards: { front: string; back: string }[] = []
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    cards = JSON.parse(cleaned)
    if (!Array.isArray(cards)) cards = []
  } catch {
    cards = []
  }

  return NextResponse.json({ cards })
}
