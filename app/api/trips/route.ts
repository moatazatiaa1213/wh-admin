import { NextResponse } from 'next/server'
import { getTrips, createTrip } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

/** Returns the trip that already owns this number, or null if it's free. */
async function findDuplicateTripNumber(tripNumber: string, excludeId?: string) {
  const trips = await getTrips({})
  return trips.find(
    t => t.trip_number === tripNumber && t.id !== excludeId
  ) ?? null
}

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
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()

    // Block duplicate trip numbers
    if (data.trip_number) {
      const duplicate = await findDuplicateTripNumber(data.trip_number)
      if (duplicate) {
        return NextResponse.json(
          { error: `Trip number "${data.trip_number}" is already used by "${duplicate.title}".` },
          { status: 409 }
        )
      }
    }

    const trip = await createTrip(data)
    revalidatePath('/trips')
    return NextResponse.json(trip, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
