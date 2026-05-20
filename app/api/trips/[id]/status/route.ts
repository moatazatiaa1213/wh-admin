import { NextResponse } from 'next/server'
import { getTrip, updateTrip } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const { status } = await req.json()
    if (!['published', 'draft'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
    const existing = await getTrip(params.id)
    const trip = await updateTrip(params.id, { ...existing, status })
    revalidatePath('/trips')
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
