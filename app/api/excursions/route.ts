import { NextResponse } from 'next/server'
import { getExcursions, createExcursion } from '@/lib/wp-client'

export async function GET() {
  try {
    const excursions = await getExcursions()
    return NextResponse.json(excursions)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const excursion = await createExcursion(data)
    return NextResponse.json(excursion, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
