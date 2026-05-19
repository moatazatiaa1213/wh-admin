import { NextResponse } from 'next/server'
import { getCities, createCity } from '@/lib/wp-client'

export async function GET() {
  try {
    const cities = await getCities()
    return NextResponse.json(cities)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const city = await createCity(data)
    return NextResponse.json(city, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
