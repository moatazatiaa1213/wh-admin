import { NextResponse } from 'next/server'
import { getTrip, updateTrip, deleteTrip, getTrips } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const trip = await getTrip(params.id)
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()

    // Block duplicate trip numbers — exclude the current trip being edited
    if (data.trip_number) {
      const trips = await getTrips({})
      const duplicate = trips.find(
        t => t.trip_number === data.trip_number && t.id !== params.id
      )
      if (duplicate) {
        return NextResponse.json(
          { error: `Trip number "${data.trip_number}" is already used by "${duplicate.title}".` },
          { status: 409 }
        )
      }
    }

    const trip = await updateTrip(params.id, data)
    revalidatePath('/trips')
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteTrip(params.id)
    revalidatePath('/trips')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
