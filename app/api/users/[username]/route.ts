import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { deleteUser } from '@/lib/users'

export async function DELETE(req: Request, { params }: { params: { username: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteUser(params.username)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
