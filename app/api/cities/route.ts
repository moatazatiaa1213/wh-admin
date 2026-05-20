import { NextResponse } from 'next/server'
import { getCities, createCity } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const cities = await getCities()
    return NextResponse.json(cities)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const city = await createCity(data)
    revalidatePath('/cities')
    return NextResponse.json(city, { status: 201 })
  } catch (e) {
    console.error('[POST /api/cities]', String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
