import type { Trip } from '@/lib/types'

/**
 * Extracts a numeric sort key from a trip's number or title, for natural
 * ascending sort. Real data is inconsistent: newer trips have a clean
 * trip_number (e.g. "01", "WH-001"), but the WordPress plugin synthesizes a
 * fallback trip_number of "WH-<post-id>" when the meta field is empty, which
 * would otherwise mask legacy trips whose actual number is only embedded in
 * the title (e.g. "03 - Nice Msc World Europa"). So: prefer a leading-digit
 * match on the title when it exists, and only fall back to trip_number's
 * digits otherwise. Entries with nothing parseable sort last.
 */
function extractSortKey(trip: Trip): number {
  const fromTitle = trip.title?.match(/^\s*(\d+)/)
  if (fromTitle) return parseInt(fromTitle[1], 10)

  const fromNumber = trip.trip_number?.match(/\d+/)
  if (fromNumber) return parseInt(fromNumber[0], 10)

  return Number.POSITIVE_INFINITY
}

export function sortTripsByNumber(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const ka = extractSortKey(a)
    const kb = extractSortKey(b)
    if (ka !== kb) return ka - kb
    return a.title.localeCompare(b.title)
  })
}
