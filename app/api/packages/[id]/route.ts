import { NextResponse } from 'next/server'
import { getPackage, updatePackage, deletePackage } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const pkg = await getPackage(params.id)
    return NextResponse.json(pkg)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const pkg = await updatePackage(params.id, data)
    revalidatePath('/packages')
    return NextResponse.json(pkg)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deletePackage(params.id)
    revalidatePath('/packages')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
