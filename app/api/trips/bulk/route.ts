import { NextResponse } from 'next/server'
import { getTrip, updateTrip, deleteTrip } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

type BulkAction = 'publish' | 'draft' | 'available' | 'completed' | 'delete'

const VALID_ACTIONS: BulkAction[] = ['publish', 'draft', 'available', 'completed', 'delete']

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth

  try {
    const body = await req.json() as { ids?: unknown; action?: unknown }
    const ids    = body.ids as string[]
    const action = body.action as BulkAction

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No trip IDs provided' }, { status: 400 })
    }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        if (action === 'delete') {
          return deleteTrip(id)
        }
        const existing = await getTrip(id)
        if (action === 'publish')   return updateTrip(id, { ...existing, status: 'published' })
        if (action === 'draft')     return updateTrip(id, { ...existing, status: 'draft' })
        if (action === 'available') return updateTrip(id, { ...existing, availability: 'available' })
        if (action === 'completed') return updateTrip(id, { ...existing, availability: 'completed' })
      })
    )

    revalidatePath('/trips')

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed    = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ ok: true, succeeded, failed })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
