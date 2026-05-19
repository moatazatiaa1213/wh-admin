import { NextResponse } from 'next/server'
import { getCity, updateCity, deleteCity } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const city = await getCity(params.id)
    return NextResponse.json(city)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const city = await updateCity(params.id, data)
    return NextResponse.json(city)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteCity(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
