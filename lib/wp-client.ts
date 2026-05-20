import {
  Trip, TripInput,
  Booking, Customer, Package, PackageInput,
  City, CityInput,
  Hotel, HotelInput,
  Airline, AirlineInput,
  Excursion, ExcursionInput,
} from '@/lib/types'
import { mockTrips } from '@/lib/mock/trips'
import { mockBookings } from '@/lib/mock/bookings'
import { mockCustomers } from '@/lib/mock/customers'
import { mockPackages } from '@/lib/mock/packages'
import { mockCities } from '@/lib/mock/cities'
import { mockHotels } from '@/lib/mock/hotels'
import { mockAirlines } from '@/lib/mock/airlines'
import { mockExcursions } from '@/lib/mock/excursions'
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache'

const USE_MOCK = process.env.USE_MOCK_DATA === 'true'

// ─── WP fetch helpers ───────────────────────────────────────────────────────

function wpFetch(path: string, init?: RequestInit) {
  const base = process.env.WP_BASE_URL
  const user = process.env.WP_USERNAME
  const pass = process.env.WP_APP_PASSWORD
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64')

  return fetch(`${base}/wp-json/whholidays/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store', // prevent Next.js Data Cache from caching WP responses
  })
}

/**
 * Fetches a list endpoint with Redis caching.
 * - cacheKey non-null: checks Redis first (60s TTL), populates on miss
 * - cacheKey null: bypasses cache entirely (for filtered/parameterised calls)
 * - Always returns [] instead of throwing on error (graceful degradation)
 */
async function wpList<T>(path: string, cacheKey: string | null): Promise<T[]> {
  // 1. Cache read
  if (cacheKey) {
    const cached = await cacheGet<T[]>(cacheKey)
    if (cached) return cached
  }

  // 2. Fetch from WordPress
  try {
    const res = await wpFetch(path)
    if (!res.ok) {
      console.warn('[wp-client]', { endpoint: path, status: res.status, ts: Date.now() })
      return []
    }
    const data: T[] = await res.json()

    // 3. Populate cache
    if (cacheKey) await cacheSet(cacheKey, data)

    return data
  } catch (e) {
    console.warn('[wp-client]', { endpoint: path, error: String(e), ts: Date.now() })
    return []
  }
}

// ─── Trips ──────────────────────────────────────────────────────────────────

export async function getTrips(params?: { search?: string; status?: string }): Promise<Trip[]> {
  if (USE_MOCK) {
    let trips = [...mockTrips]
    if (params?.search) {
      const q = params.search.toLowerCase()
      trips = trips.filter(t => t.title.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q))
    }
    if (params?.status) trips = trips.filter(t => t.status === params.status)
    return trips
  }
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  const hasFilters = !!(params?.search || params?.status)
  return wpList<Trip>(`/tours?${qs}`, hasFilters ? null : 'whh:tours')
}

export async function getTrip(id: string): Promise<Trip> {
  if (USE_MOCK) {
    const trip = mockTrips.find(t => t.id === id)
    if (!trip) throw new Error('Trip not found')
    return trip
  }
  const res = await wpFetch(`/tours/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

/**
 * Returns the next available sequential trip number, e.g. "WH-221".
 *
 * Strategy:
 *  - Fetch all trips and collect their trip_number fields
 *  - Old Tour Master trips have post-ID-based numbers like WH-7132 (large)
 *  - Real sequential numbers are WH-001 … WH-NNN (small)
 *  - We only consider numbers < 5000 as "real" sequential ones
 *  - Build a Set of all taken numbers to guarantee no duplicates
 *  - Walk up from max+1 until we find one not in the Set
 */
export async function getNextTripNumber(): Promise<string> {
  if (USE_MOCK) return 'WH-001'
  try {
    const trips = await getTrips({})

    // Collect every numeric part that looks like a real sequential number
    const taken = new Set<number>()
    for (const t of trips) {
      const m = t.trip_number?.match(/^WH-(\d+)$/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > 0 && n < 5000) taken.add(n)   // ignore post-ID fallbacks (≥5000)
      }
    }

    // Find the next number not already taken
    let next = (taken.size > 0 ? Math.max(...Array.from(taken)) : 0) + 1
    while (taken.has(next)) next++             // skip any gaps/duplicates

    return `WH-${String(next).padStart(3, '0')}`
  } catch {
    return 'WH-001'
  }
}

export async function createTrip(data: TripInput): Promise<Trip> {
  if (USE_MOCK) {
    const trip: Trip = { ...data, id: `trip-${Date.now()}`, created_at: new Date().toISOString() }
    mockTrips.push(trip)
    return trip
  }
  const res = await wpFetch('/tours', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:tours')
  return res.json()
}

export async function updateTrip(id: string, data: TripInput): Promise<Trip> {
  if (USE_MOCK) {
    const idx = mockTrips.findIndex(t => t.id === id)
    if (idx === -1) throw new Error('Trip not found')
    mockTrips[idx] = { ...mockTrips[idx], ...data }
    return mockTrips[idx]
  }
  const res = await wpFetch(`/tours/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:tours')
  return res.json()
}

export async function deleteTrip(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockTrips.findIndex(t => t.id === id)
    if (idx !== -1) mockTrips.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/tours/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:tours')
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function getBookings(params?: { status?: string }): Promise<Booking[]> {
  if (USE_MOCK) {
    let bookings = [...mockBookings]
    if (params?.status) bookings = bookings.filter(b => b.status === params.status)
    return bookings
  }
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  return wpList<Booking>(`/bookings?${qs}`, params?.status ? null : 'whh:bookings')
}

export async function getBooking(id: string): Promise<Booking> {
  if (USE_MOCK) {
    const booking = mockBookings.find(b => b.id === id)
    if (!booking) throw new Error('Booking not found')
    return booking
  }
  const res = await wpFetch(`/bookings/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  if (USE_MOCK) return [...mockCustomers]
  return wpList<Customer>('/customers', 'whh:customers')
}

export async function getCustomer(id: string): Promise<Customer> {
  if (USE_MOCK) {
    const customer = mockCustomers.find(c => c.id === id)
    if (!customer) throw new Error('Customer not found')
    return customer
  }
  const res = await wpFetch(`/customers/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

// ─── Packages ────────────────────────────────────────────────────────────────

export async function getPackages(): Promise<Package[]> {
  if (USE_MOCK) return [...mockPackages]
  return wpList<Package>('/packages', 'whh:packages')
}

export async function getPackage(id: string): Promise<Package> {
  if (USE_MOCK) {
    const pkg = mockPackages.find(p => p.id === id)
    if (!pkg) throw new Error('Package not found')
    return pkg
  }
  const res = await wpFetch(`/packages/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function createPackage(data: PackageInput): Promise<Package> {
  if (USE_MOCK) {
    const trip = mockTrips.find(t => t.id === data.trip_id)
    const pkg: Package = { ...data, id: `pkg-${Date.now()}`, trip_title: trip?.title ?? '', created_at: new Date().toISOString() }
    mockPackages.push(pkg)
    return pkg
  }
  const res = await wpFetch('/packages', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:packages')
  return res.json()
}

export async function updatePackage(id: string, data: PackageInput): Promise<Package> {
  if (USE_MOCK) {
    const idx = mockPackages.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Package not found')
    const trip = mockTrips.find(t => t.id === data.trip_id)
    mockPackages[idx] = { ...mockPackages[idx], ...data, trip_title: trip?.title ?? '' }
    return mockPackages[idx]
  }
  const res = await wpFetch(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:packages')
  return res.json()
}

export async function deletePackage(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockPackages.findIndex(p => p.id === id)
    if (idx !== -1) mockPackages.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/packages/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:packages')
}

// ─── Cities ──────────────────────────────────────────────────────────────────

export async function getCities(): Promise<City[]> {
  if (USE_MOCK) return [...mockCities]
  return wpList<City>('/cities', 'whh:cities')
}

export async function getCity(id: string): Promise<City> {
  if (USE_MOCK) {
    const city = mockCities.find(c => c.id === id)
    if (!city) throw new Error('City not found')
    return city
  }
  const res = await wpFetch(`/cities/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function createCity(data: CityInput): Promise<City> {
  if (USE_MOCK) {
    const city: City = { ...data, id: `city-${Date.now()}` }
    mockCities.push(city)
    return city
  }
  const res = await wpFetch('/cities', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`WP API error ${res.status}: ${body}`)
  }
  await cacheInvalidate('whh:cities')
  return res.json()
}

export async function updateCity(id: string, data: CityInput): Promise<City> {
  if (USE_MOCK) {
    const idx = mockCities.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('City not found')
    mockCities[idx] = { ...mockCities[idx], ...data }
    return mockCities[idx]
  }
  const res = await wpFetch(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:cities')
  return res.json()
}

export async function deleteCity(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockCities.findIndex(c => c.id === id)
    if (idx !== -1) mockCities.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/cities/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:cities')
}

// ─── Hotels ──────────────────────────────────────────────────────────────────

export async function getHotels(): Promise<Hotel[]> {
  if (USE_MOCK) return [...mockHotels]
  return wpList<Hotel>('/hotels', 'whh:hotels')
}

export async function getHotel(id: string): Promise<Hotel> {
  if (USE_MOCK) {
    const hotel = mockHotels.find(h => h.id === id)
    if (!hotel) throw new Error('Hotel not found')
    return hotel
  }
  const res = await wpFetch(`/hotels/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function createHotel(data: HotelInput): Promise<Hotel> {
  if (USE_MOCK) {
    const hotel: Hotel = { ...data, id: `hotel-${Date.now()}` }
    mockHotels.push(hotel)
    return hotel
  }
  const res = await wpFetch('/hotels', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:hotels')
  return res.json()
}

export async function updateHotel(id: string, data: HotelInput): Promise<Hotel> {
  if (USE_MOCK) {
    const idx = mockHotels.findIndex(h => h.id === id)
    if (idx === -1) throw new Error('Hotel not found')
    mockHotels[idx] = { ...mockHotels[idx], ...data }
    return mockHotels[idx]
  }
  const res = await wpFetch(`/hotels/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:hotels')
  return res.json()
}

export async function deleteHotel(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockHotels.findIndex(h => h.id === id)
    if (idx !== -1) mockHotels.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/hotels/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:hotels')
}

// ─── Airlines ────────────────────────────────────────────────────────────────

export async function getAirlines(): Promise<Airline[]> {
  if (USE_MOCK) return [...mockAirlines]
  return wpList<Airline>('/airlines', 'whh:airlines')
}

export async function getAirline(id: string): Promise<Airline> {
  if (USE_MOCK) {
    const airline = mockAirlines.find(a => a.id === id)
    if (!airline) throw new Error('Airline not found')
    return airline
  }
  const res = await wpFetch(`/airlines/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function createAirline(data: AirlineInput): Promise<Airline> {
  if (USE_MOCK) {
    const airline: Airline = { ...data, id: `airline-${Date.now()}` }
    mockAirlines.push(airline)
    return airline
  }
  const res = await wpFetch('/airlines', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:airlines')
  return res.json()
}

export async function updateAirline(id: string, data: AirlineInput): Promise<Airline> {
  if (USE_MOCK) {
    const idx = mockAirlines.findIndex(a => a.id === id)
    if (idx === -1) throw new Error('Airline not found')
    mockAirlines[idx] = { ...mockAirlines[idx], ...data }
    return mockAirlines[idx]
  }
  const res = await wpFetch(`/airlines/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:airlines')
  return res.json()
}

export async function deleteAirline(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockAirlines.findIndex(a => a.id === id)
    if (idx !== -1) mockAirlines.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/airlines/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:airlines')
}

// ─── Excursions ───────────────────────────────────────────────────────────────

export async function getExcursions(): Promise<Excursion[]> {
  if (USE_MOCK) return [...mockExcursions]
  return wpList<Excursion>('/excursions', 'whh:excursions')
}

export async function getExcursion(id: string): Promise<Excursion> {
  if (USE_MOCK) {
    const excursion = mockExcursions.find(e => e.id === id)
    if (!excursion) throw new Error('Excursion not found')
    return excursion
  }
  const res = await wpFetch(`/excursions/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function createExcursion(data: ExcursionInput): Promise<Excursion> {
  if (USE_MOCK) {
    const excursion: Excursion = { ...data, id: `exc-${Date.now()}` }
    mockExcursions.push(excursion)
    return excursion
  }
  const res = await wpFetch('/excursions', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:excursions')
  return res.json()
}

export async function updateExcursion(id: string, data: ExcursionInput): Promise<Excursion> {
  if (USE_MOCK) {
    const idx = mockExcursions.findIndex(e => e.id === id)
    if (idx === -1) throw new Error('Excursion not found')
    mockExcursions[idx] = { ...mockExcursions[idx], ...data }
    return mockExcursions[idx]
  }
  const res = await wpFetch(`/excursions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:excursions')
  return res.json()
}

export async function deleteExcursion(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockExcursions.findIndex(e => e.id === id)
    if (idx !== -1) mockExcursions.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/excursions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:excursions')
}
