import { Trip, TripInput, Booking, Customer, Package, PackageInput } from '@/lib/types'
import { mockTrips } from '@/lib/mock/trips'
import { mockBookings } from '@/lib/mock/bookings'
import { mockCustomers } from '@/lib/mock/customers'
import { mockPackages } from '@/lib/mock/packages'

const USE_MOCK = process.env.USE_MOCK_DATA === 'true'

// ─── WP fetch helper ────────────────────────────────────────────────────────

function wpFetch(path: string, init?: RequestInit) {
  const base = process.env.WP_BASE_URL
  const user = process.env.WP_USERNAME
  const pass = process.env.WP_APP_PASSWORD
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64')

  return fetch(`${base}/wp-json/wpte/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

// ─── Trips ──────────────────────────────────────────────────────────────────

export async function getTrips(params?: { search?: string; status?: string }): Promise<Trip[]> {
  if (USE_MOCK) {
    let trips = [...mockTrips]
    if (params?.search) {
      const q = params.search.toLowerCase()
      trips = trips.filter(t => t.title.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q))
    }
    if (params?.status) {
      trips = trips.filter(t => t.status === params.status)
    }
    return trips
  }

  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  const res = await wpFetch(`/trips?${qs}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function getTrip(id: string): Promise<Trip> {
  if (USE_MOCK) {
    const trip = mockTrips.find(t => t.id === id)
    if (!trip) throw new Error('Trip not found')
    return trip
  }
  const res = await wpFetch(`/trips/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function createTrip(data: TripInput): Promise<Trip> {
  if (USE_MOCK) {
    const trip: Trip = { ...data, id: `trip-${Date.now()}`, created_at: new Date().toISOString() }
    mockTrips.push(trip)
    return trip
  }
  const res = await wpFetch('/trips', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function updateTrip(id: string, data: TripInput): Promise<Trip> {
  if (USE_MOCK) {
    const idx = mockTrips.findIndex(t => t.id === id)
    if (idx === -1) throw new Error('Trip not found')
    mockTrips[idx] = { ...mockTrips[idx], ...data }
    return mockTrips[idx]
  }
  const res = await wpFetch(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function deleteTrip(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockTrips.findIndex(t => t.id === id)
    if (idx !== -1) mockTrips.splice(idx, 1)
    return
  }
  const res = await wpFetch(`/trips/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
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
  const res = await wpFetch(`/bookings?${qs}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
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
  const res = await wpFetch('/enquiries')
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

export async function getCustomer(id: string): Promise<Customer> {
  if (USE_MOCK) {
    const customer = mockCustomers.find(c => c.id === id)
    if (!customer) throw new Error('Customer not found')
    return customer
  }
  const res = await wpFetch(`/enquiries/${id}`)
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
}

// ─── Packages ────────────────────────────────────────────────────────────────

export async function getPackages(): Promise<Package[]> {
  if (USE_MOCK) return [...mockPackages]
  const res = await wpFetch('/packages')
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  return res.json()
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
}
