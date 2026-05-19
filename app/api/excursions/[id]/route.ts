import { NextResponse } from 'next/server'
import { getExcursion, updateExcursion, deleteExcursion } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const excursion = await getExcursion(params.id)
    return NextResponse.json(excursion)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const excursion = await updateExcursion(params.id, data)
    return NextResponse.json(excursion)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteExcursion(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
