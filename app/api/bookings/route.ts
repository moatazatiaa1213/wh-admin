import { NextResponse } from 'next/server'
import { getBookings } from '@/lib/wp-client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const bookings = await getBookings({ status: searchParams.get('status') ?? undefined })
    return NextResponse.json(bookings)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
