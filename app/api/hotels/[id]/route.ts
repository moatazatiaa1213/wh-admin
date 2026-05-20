import { NextResponse } from 'next/server'
import { getHotel, updateHotel, deleteHotel } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const hotel = await getHotel(params.id)
    return NextResponse.json(hotel)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const hotel = await updateHotel(params.id, data)
    revalidatePath('/hotels')
    return NextResponse.json(hotel)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteHotel(params.id)
    revalidatePath('/hotels')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
