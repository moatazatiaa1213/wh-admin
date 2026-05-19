import { NextResponse } from 'next/server'
import { getAirlines, createAirline } from '@/lib/wp-client'

export async function GET() {
  try {
    const airlines = await getAirlines()
    return NextResponse.json(airlines)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const airline = await createAirline(data)
    return NextResponse.json(airline, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
