import { NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'
import { verifyCredentials } from '@/lib/users'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    const isRoot =
      username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS

    if (!isRoot && !(await verifyCredentials(username, password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({ sub: username })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
