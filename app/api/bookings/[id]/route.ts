import { NextResponse } from 'next/server'
import { getBooking } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const booking = await getBooking(params.id)
    return NextResponse.json(booking)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
