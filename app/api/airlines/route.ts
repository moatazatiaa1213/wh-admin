import { NextResponse } from 'next/server'
import { getAirlines, createAirline } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const airlines = await getAirlines()
    return NextResponse.json(airlines)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const airline = await createAirline(data)
    revalidatePath('/airlines')
    return NextResponse.json(airline, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
