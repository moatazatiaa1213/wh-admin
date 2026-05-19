import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await getCustomer(params.id)
    return NextResponse.json(customer)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
