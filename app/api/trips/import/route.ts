import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'
import {
  getCities, getHotels, getAirlines, getExcursions,
  createTrip, getNextTripNumber,
} from '@/lib/wp-client'

export interface ImportResult {
  row: number
  title: string
  status: 'ok' | 'error'
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveNames<T extends { id: string; name: string }>(
  items: T[],
  raw: string,
): string[] {
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map(n => n.trim())
    .flatMap(name => {
      const found = items.find(i => i.name.toLowerCase() === name.toLowerCase())
      return found ? [found.id] : []
    })
}

function cell(row: string[], idx: Record<string, number>, col: string): string {
  const i = idx[col]
  return i !== undefined ? String(row[i] ?? '').trim() : ''
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb     = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const ws     = wb.Sheets[wb.SheetNames[0]]

    // Parse as array-of-arrays; raw:false so dates come as strings
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
    })

    if (rows.length < 3) {
      return NextResponse.json(
        { error: 'The file contains no data rows. Start data from row 3.' },
        { status: 400 },
      )
    }

    // Row 0 = headers, Row 1 = descriptions (ignored), Row 2+ = data
    const headerRow = (rows[0] as string[]).map(h => String(h).trim())
    const dataRows  = (rows.slice(2) as string[][]).filter(r =>
      r.some(c => String(c).trim() !== ''),
    )

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found after the header rows.' },
        { status: 400 },
      )
    }

    // Column-name → index map
    const idx: Record<string, number> = {}
    headerRow.forEach((h, i) => { idx[h] = i })

    // Fetch library data once for name resolution
    const [cities, hotels, airlines, excursions] = await Promise.all([
      getCities(), getHotels(), getAirlines(), getExcursions(),
    ])

    // Keep a counter so auto-incremented trip numbers don't collide
    let nextNumCache: string | null = null

    const results: ImportResult[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row    = dataRows[i]
      const rowNum = i + 3 // 1-indexed (header=1, desc=2, data starts at 3)
      const title  = cell(row, idx, 'title')

      if (!title) {
        results.push({ row: rowNum, title: '(empty)', status: 'error', error: 'Title is required' })
        continue
      }

      try {
        const travelDate = cell(row, idx, 'travel_date')
        const endDate    = cell(row, idx, 'end_date')

        // Auto-calculate duration
        let durationDays   = parseInt(cell(row, idx, 'duration_days'))   || 0
        let durationNights = parseInt(cell(row, idx, 'duration_nights')) || 0
        if (travelDate && endDate && (!durationDays || !durationNights)) {
          const start  = new Date(travelDate)
          const end    = new Date(endDate)
          const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
          if (nights > 0) {
            durationNights = nights
            durationDays   = nights + 1
          }
        }

        // Auto trip_number if not provided
        let tripNumber = cell(row, idx, 'trip_number')
        if (!tripNumber) {
          if (!nextNumCache) nextNumCache = await getNextTripNumber()
          tripNumber    = nextNumCache
          nextNumCache  = null // force re-fetch next time (in case WP updated)
        }

        const status       = (cell(row, idx, 'status')       || 'draft')     as 'draft' | 'published'
        const availability = (cell(row, idx, 'availability') || 'available') as 'available' | 'completed'
        const featuredImg  = cell(row, idx, 'featured_image')

        await createTrip({
          title,
          trip_number:     tripNumber,
          description:     cell(row, idx, 'description'),
          destination:     cell(row, idx, 'destination'),
          travel_date:     travelDate,
          end_date:        endDate,
          duration_days:   durationDays,
          duration_nights: durationNights,
          price_adult:     parseFloat(cell(row, idx, 'price_adult'))  || 0,
          price_child:     parseFloat(cell(row, idx, 'price_child'))  || 0,
          deposit:         parseFloat(cell(row, idx, 'deposit'))      || 0,
          single_rate:     parseFloat(cell(row, idx, 'single_rate'))  || 0,
          status,
          availability,
          ...(featuredImg ? { featured_image: featuredImg } : {}),
          city_ids:      resolveNames(cities,     cell(row, idx, 'cities')),
          hotel_ids:     resolveNames(hotels,     cell(row, idx, 'hotels')),
          airline_ids:   resolveNames(airlines,   cell(row, idx, 'airlines')),
          excursion_ids: resolveNames(excursions, cell(row, idx, 'excursions')),
          // No per-city-nights column in the import template (see plan follow-up
          // note) — imported trips use duration_days/duration_nights directly.
          city_nights: {},
        })

        results.push({ row: rowNum, title, status: 'ok' })
      } catch (e) {
        results.push({ row: rowNum, title, status: 'error', error: String(e) })
      }
    }

    revalidatePath('/trips')

    return NextResponse.json({
      ok:        true,
      succeeded: results.filter(r => r.status === 'ok').length,
      failed:    results.filter(r => r.status === 'error').length,
      results,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
