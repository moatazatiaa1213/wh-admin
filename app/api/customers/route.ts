import { NextResponse } from 'next/server'
import { getCustomers } from '@/lib/wp-client'

export async function GET() {
  try {
    const customers = await getCustomers()
    return NextResponse.json(customers)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
