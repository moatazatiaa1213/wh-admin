import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { listUsers, createUser } from '@/lib/users'

export async function GET() {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const users = await listUsers()
    return NextResponse.json(users)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const { username, password } = await req.json()

    if (typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const user = await createUser(username.trim(), password)
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? String(e) }, { status: 400 })
  }
}
