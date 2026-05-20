import { NextResponse } from 'next/server'
import { getCustomers } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const customers = await getCustomers()
    return NextResponse.json(customers)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
