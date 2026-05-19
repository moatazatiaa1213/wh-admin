import { NextResponse } from 'next/server'
import { getHotels, createHotel } from '@/lib/wp-client'

export async function GET() {
  try {
    const hotels = await getHotels()
    return NextResponse.json(hotels)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const hotel = await createHotel(data)
    return NextResponse.json(hotel, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
