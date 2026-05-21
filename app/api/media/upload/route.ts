import { NextResponse } from 'next/server'
import { requireAuth }  from '@/lib/api-auth'
import { uploadTripImage } from '@/lib/wp-client'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type AllowedMime = typeof ALLOWED_TYPES[number]

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const mimeType = file.type as AllowedMime
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use JPEG, PNG, WebP, or GIF.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadTripImage(buffer, mimeType === 'image/gif' ? 'image/jpeg' : mimeType, file.name)

    return NextResponse.json({ id: result.id, url: result.url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
