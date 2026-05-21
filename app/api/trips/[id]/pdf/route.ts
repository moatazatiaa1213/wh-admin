import { NextResponse }    from 'next/server'
import { renderToBuffer }  from '@react-pdf/renderer'
import { createElement }   from 'react'
import * as fs             from 'fs'
import * as path           from 'path'
import {
  getTrip, getCities, getHotels, getAirlines, getExcursions,
} from '@/lib/wp-client'
import { TripBrochure } from '@/lib/trip-brochure'

// ── Load logo once at module level ────────────────────────────────────────────

function loadLogoBase64(): string | undefined {
  const candidates: { file: string; mime: string }[] = [
    { file: 'wh-logo.png',  mime: 'image/png'  },
    { file: 'wh-logo.jpg',  mime: 'image/jpeg' },
    { file: 'wh-logo.jpeg', mime: 'image/jpeg' },
  ]
  for (const { file, mime } of candidates) {
    try {
      const buf = fs.readFileSync(path.join(process.cwd(), 'public', file))
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch { /* try next */ }
  }
  return undefined   // no logo file found — brochure renders without it
}

const LOGO_BASE64 = loadLogoBase64()

// ── Route handler (public — no auth required) ─────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params

  try {
    // Fetch trip + all library data in parallel
    const [trip, allCities, allHotels, allAirlines, allExcursions] = await Promise.all([
      getTrip(id),
      getCities(),
      getHotels(),
      getAirlines(),
      getExcursions(),
    ])

    // Resolve IDs → names
    const cities     = allCities.filter(c  => trip.city_ids.includes(c.id))
    const hotels     = allHotels.filter(h  => trip.hotel_ids.includes(h.id))
    const airlines   = allAirlines.filter(a => trip.airline_ids.includes(a.id))
    const excursions = allExcursions.filter(e => trip.excursion_ids.includes(e.id))

    // Generate PDF buffer
    const element = createElement(TripBrochure, {
      trip,
      cities,
      hotels,
      airlines,
      excursions,
      logoBase64: LOGO_BASE64,
    })

    const buffer = await renderToBuffer(element)

    const filename = `${trip.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-brochure.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (e) {
    console.error('[pdf]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
