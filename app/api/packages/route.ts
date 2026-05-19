import { NextResponse } from 'next/server'
import { getPackages, createPackage } from '@/lib/wp-client'

export async function GET() {
  try {
    const packages = await getPackages()
    return NextResponse.json(packages)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const pkg = await createPackage(data)
    return NextResponse.json(pkg, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
