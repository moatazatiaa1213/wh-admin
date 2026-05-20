import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

/**
 * Call at the top of any API route handler that requires authentication.
 * Returns null if the request is authenticated (caller should continue).
 * Returns a 401 NextResponse if not — the caller should return it immediately.
 *
 * Usage:
 *   const auth = await requireAuth()
 *   if (auth) return auth
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await verifyToken(token)
    return null // authenticated
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
