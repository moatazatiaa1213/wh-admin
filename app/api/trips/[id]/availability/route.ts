import { NextResponse } from 'next/server'
import { getTrip, updateTrip } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const { availability } = await req.json()
    if (!['available', 'completed'].includes(availability)) {
      return NextResponse.json({ error: 'Invalid availability value' }, { status: 400 })
    }
    // Fetch existing trip and merge only the availability field
    const existing = await getTrip(params.id)
    const trip = await updateTrip(params.id, { ...existing, availability })
    revalidatePath('/trips')
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
