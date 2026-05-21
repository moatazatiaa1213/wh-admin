import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth) return auth

  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Trips data ───────────────────────────────────────────────────
  const headers = [
    'title', 'trip_number', 'description', 'destination',
    'travel_date', 'end_date', 'duration_days', 'duration_nights',
    'price_adult', 'price_child', 'deposit', 'single_rate',
    'status', 'availability', 'featured_image',
    'cities', 'hotels', 'airlines', 'excursions',
  ]

  const descriptions = [
    'Trip title (required)',
    'e.g. WH-001 (required)',
    'Full description (required)',
    'e.g. Istanbul, Turkey (required)',
    'Start date — YYYY-MM-DD (required)',
    'End date — YYYY-MM-DD (required)',
    'Leave blank to auto-calculate',
    'Leave blank to auto-calculate',
    'Adult price in USD (required)',
    'Child price in USD (0 if none)',
    'Deposit amount in USD (0 if none)',
    'Single-room rate in USD (0 if none)',
    '"draft" or "published" (default: draft)',
    '"available" or "completed" (default: available)',
    'Image URL — https://… (optional)',
    'Comma-separated city names (must match Cities library)',
    'Comma-separated hotel names (must match Hotels library)',
    'Comma-separated airline names (must match Airlines library)',
    'Comma-separated excursion names (must match Excursions library)',
  ]

  const example1 = [
    'Istanbul 10 Nights Package',
    'WH-001',
    'A wonderful journey through historic Istanbul with full board accommodation and guided tours.',
    'Istanbul, Turkey',
    '2026-08-01',
    '2026-08-11',
    '',   // auto
    '',   // auto
    1200,
    800,
    300,
    1450,
    'draft',
    'available',
    '',
    'Istanbul',
    'Hilton Istanbul Bomonti',
    'Turkish Airlines',
    'Bosphorus Cruise, Hagia Sophia Tour',
  ]

  const example2 = [
    'Cairo & Pyramids Explorer',
    'WH-002',
    'Explore the ancient wonders of Egypt including the Pyramids of Giza and the Egyptian Museum.',
    'Cairo, Egypt',
    '2026-09-15',
    '2026-09-22',
    '',
    '',
    950,
    650,
    200,
    1100,
    'draft',
    'available',
    '',
    'Cairo',
    'Marriott Mena House',
    'EgyptAir',
    'Pyramids Tour, Cairo Museum Visit',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, descriptions, example1, example2])

  ws['!cols'] = [
    { wch: 32 }, // title
    { wch: 12 }, // trip_number
    { wch: 55 }, // description
    { wch: 25 }, // destination
    { wch: 16 }, // travel_date
    { wch: 16 }, // end_date
    { wch: 16 }, // duration_days
    { wch: 17 }, // duration_nights
    { wch: 13 }, // price_adult
    { wch: 13 }, // price_child
    { wch: 11 }, // deposit
    { wch: 13 }, // single_rate
    { wch: 13 }, // status
    { wch: 16 }, // availability
    { wch: 42 }, // featured_image
    { wch: 30 }, // cities
    { wch: 30 }, // hotels
    { wch: 30 }, // airlines
    { wch: 40 }, // excursions
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Trips')

  // ── Sheet 2: Field guide ──────────────────────────────────────────────────
  const guide = [
    ['Field', 'Required', 'Format / Notes'],
    ['title',           'Yes', 'Plain text — the trip name shown everywhere'],
    ['trip_number',     'Yes', 'WH-NNN format. Must be unique across all trips'],
    ['description',     'Yes', 'Plain text. Displayed on the public trip page'],
    ['destination',     'Yes', 'Plain text, e.g. "Istanbul, Turkey"'],
    ['travel_date',     'Yes', 'ISO date: YYYY-MM-DD, e.g. 2026-08-01'],
    ['end_date',        'Yes', 'ISO date: YYYY-MM-DD, e.g. 2026-08-11'],
    ['duration_days',   'No',  'Integer. Auto-calculated from dates if blank'],
    ['duration_nights', 'No',  'Integer. Auto-calculated from dates if blank'],
    ['price_adult',     'Yes', 'Number (no currency symbol), e.g. 1200'],
    ['price_child',     'No',  'Number. Use 0 if no child price'],
    ['deposit',         'No',  'Number. Use 0 if no deposit required'],
    ['single_rate',     'No',  'Number. Single-room supplement'],
    ['status',          'No',  '"draft" (default) or "published"'],
    ['availability',    'No',  '"available" (default) or "completed"'],
    ['featured_image',  'No',  'Full URL starting with https://'],
    ['cities',          'No',  'Comma-separated names — must match Cities library exactly'],
    ['hotels',          'No',  'Comma-separated names — must match Hotels library exactly'],
    ['airlines',        'No',  'Comma-separated names — must match Airlines library exactly'],
    ['excursions',      'No',  'Comma-separated names — must match Excursions library exactly'],
    [],
    ['TIPS', '', ''],
    ['• Row 1 (headers) and Row 2 (descriptions) are ignored during import — do not delete them.', '', ''],
    ['• Start your data from Row 3.', '', ''],
    ['• Cities / Hotels / Airlines / Excursions are matched by name (case-insensitive).', '', ''],
    ['• Unmatched names are silently skipped; the trip is still created.', '', ''],
    ['• Dates must be in YYYY-MM-DD format (Excel may reformat them — check before uploading).', '', ''],
  ]

  const wsGuide = XLSX.utils.aoa_to_sheet(guide)
  wsGuide['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Field Guide')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="wh-trips-template.xlsx"',
    },
  })
}
