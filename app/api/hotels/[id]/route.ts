import { NextResponse } from 'next/server'
import { getHotel, updateHotel, deleteHotel } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const hotel = await getHotel(params.id)
    return NextResponse.json(hotel)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const hotel = await updateHotel(params.id, data)
    return NextResponse.json(hotel)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteHotel(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
