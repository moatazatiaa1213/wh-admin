import { NextResponse } from 'next/server'
import { getPackages, createPackage } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const packages = await getPackages()
    return NextResponse.json(packages)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const pkg = await createPackage(data)
    revalidatePath('/packages')
    return NextResponse.json(pkg, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
