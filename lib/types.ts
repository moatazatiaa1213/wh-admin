// ─── Standalone Library types ─────────────────────────────────────────────────

export interface City {
  id: string
  name: string
  country: string
  location: string
  photo?: string
  map_url?: string
}

export interface Hotel {
  id: string
  name: string
  stars: number
  location: string
  photo?: string
  website?: string
  map_url?: string
}

export interface Airline {
  id: string
  name: string
  photo?: string
  type?: 'domestic' | 'international'
  checked_bags_count?: number
  checked_bags_weight_kg?: number
  carry_on_weight_kg?: number
}

export interface Excursion {
  id: string
  name: string
  description: string
  photo?: string
}

// ─── Core types ───────────────────────────────────────────────────────────────

// The 8 curated tour-destination taxonomy terms (also used by the site's
// homepage "Popular Destinations" widget) — the only values ever assigned to
// a trip's category, so the taxonomy never gets polluted with one-off terms.
export const TRIP_CATEGORIES = [
  'Western Europe',
  'Eastern Europe',
  'Southern Europe',
  'Northern Europe',
  'Middle East',
  'Far East',
  'Asia',
  'African Adventure',
] as const

export type TripCategory = typeof TRIP_CATEGORIES[number]

export interface Trip {
  id: string
  title: string
  trip_number: string
  description: string
  destination: string
  trip_category?: TripCategory

  // Dates
  travel_date: string   // ISO date string, e.g. "2026-07-01"
  end_date: string      // ISO date string
  duration_days: number
  duration_nights: number

  // Pricing
  price_adult: number
  price_child: number
  deposit: number
  single_rate: number

  featured_image?: string
  status: 'draft' | 'published'
  availability: 'available' | 'completed'   // manually set; 'completed' = greyed out on public site
  created_at: string

  // Library ID references
  city_ids: string[]
  hotel_ids: string[]
  airline_ids: string[]
  excursion_ids: string[]

  // Nights stayed per city (city_id -> nights); duration_nights/duration_days
  // are derived from this as the source of truth (see components/trip-form.tsx)
  city_nights: Record<string, number>

  // Day-by-day itinerary. Ordered by array position (day numbers are kept
  // sequential 1..N by the editor UI, not independently reorderable — see
  // components/trip-form.tsx).
  itinerary: { day: number; title: string; description: string }[]
}

export type TripInput = Omit<Trip, 'id' | 'created_at'> & {
  featured_image_id?: number   // WordPress attachment ID — set as post thumbnail
}
export type CityInput = Omit<City, 'id'>
export type HotelInput = Omit<Hotel, 'id'>
export type AirlineInput = Omit<Airline, 'id'>
export type ExcursionInput = Omit<Excursion, 'id'>

export interface Booking {
  id: string
  customer_name: string
  customer_email: string
  trip_id: string
  trip_title: string
  booking_date: string
  status: 'confirmed' | 'pending' | 'cancelled'
  amount: number
  notes?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  trip_id?: string
  trip_title?: string
  enquiry_date: string
}

export interface Package {
  id: string
  name: string
  price: number
  trip_id: string
  trip_title: string
  inclusions: string
  max_people: number
  created_at: string
}

export type PackageInput = Omit<Package, 'id' | 'created_at' | 'trip_title'>
