// ─── Nested Trip sub-types ────────────────────────────────────────────────────

export interface City {
  name: string
  country: string
  location: string
}

export interface Hotel {
  name: string
  stars: number         // 1–5
  location: string
  photo?: string        // URL
  website?: string      // URL
}

export interface Airline {
  name: string
  photo?: string        // URL
  baggage_allowance: string
}

export interface Excursion {
  name: string
  description: string
  photo?: string        // URL
}

// ─── Core types ───────────────────────────────────────────────────────────────

export interface Trip {
  id: string
  title: string
  trip_number: string
  description: string
  destination: string

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
  created_at: string

  // Nested data
  cities: City[]
  hotels: Hotel[]
  airlines: Airline[]
  excursions: Excursion[]
}

export type TripInput = Omit<Trip, 'id' | 'created_at'>

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
