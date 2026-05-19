import { NextResponse } from 'next/server'
import { getAirline, updateAirline, deleteAirline } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const airline = await getAirline(params.id)
    return NextResponse.json(airline)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const airline = await updateAirline(params.id, data)
    return NextResponse.json(airline)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteAirline(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
