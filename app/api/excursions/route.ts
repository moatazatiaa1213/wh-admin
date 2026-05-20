import { NextResponse } from 'next/server'
import { getExcursions, createExcursion } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const excursions = await getExcursions()
    return NextResponse.json(excursions)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const excursion = await createExcursion(data)
    revalidatePath('/excursions')
    return NextResponse.json(excursion, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
