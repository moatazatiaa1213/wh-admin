import { NextResponse } from 'next/server'
import { getCity, updateCity, deleteCity } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const city = await getCity(params.id)
    return NextResponse.json(city)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const city = await updateCity(params.id, data)
    revalidatePath('/cities')
    return NextResponse.json(city)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteCity(params.id)
    revalidatePath('/cities')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
