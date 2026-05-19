import { NextResponse } from 'next/server'
import { getTrips, createTrip } from '@/lib/wp-client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const trips = await getTrips({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return NextResponse.json(trips)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const trip = await createTrip(data)
    return NextResponse.json(trip, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
