import { NextResponse } from 'next/server'
import { getBooking } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const booking = await getBooking(params.id)
    return NextResponse.json(booking)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
