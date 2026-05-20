import { NextResponse } from 'next/server'
import { getHotels, createHotel } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const hotels = await getHotels()
    return NextResponse.json(hotels)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const hotel = await createHotel(data)
    revalidatePath('/hotels')
    return NextResponse.json(hotel, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
