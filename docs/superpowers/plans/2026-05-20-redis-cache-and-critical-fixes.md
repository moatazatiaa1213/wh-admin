# Redis Cache + Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Upstash Redis caching (60s TTL, write-through invalidation) to all WordPress list calls, secure every API route with JWT auth, fix Next.js data cache misuse, and guard against malformed date strings.

**Architecture:** A new `lib/cache.ts` module wraps Upstash Redis with three typed helpers (`cacheGet`, `cacheSet`, `cacheInvalidate`). `wpList()` in `lib/wp-client.ts` checks Redis before hitting WordPress, and every mutation function invalidates the relevant key. A new `lib/api-auth.ts` helper is called at the top of every API route write handler to verify the `auth_token` JWT cookie.

**Tech Stack:** Next.js 14 App Router, `@upstash/redis` (REST client, Vercel-native), `jose` (already installed for JWT), TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/cache.ts` | **Create** | Upstash Redis wrapper — cacheGet, cacheSet, cacheInvalidate |
| `lib/api-auth.ts` | **Create** | requireAuth() helper for API route handlers |
| `lib/utils.ts` | **Modify** | Add formatDate() safe date formatter |
| `lib/wp-client.ts` | **Modify** | Add `cache:'no-store'` to wpFetch; add cacheKey param to wpList; add cacheInvalidate to all mutations |
| `app/api/trips/route.ts` | **Modify** | requireAuth on POST; revalidatePath on POST |
| `app/api/trips/[id]/route.ts` | **Modify** | requireAuth on PUT/DELETE; revalidatePath on PUT/DELETE |
| `app/api/bookings/route.ts` | **Modify** | requireAuth on GET |
| `app/api/bookings/[id]/route.ts` | **Modify** | requireAuth on GET |
| `app/api/customers/route.ts` | **Modify** | requireAuth on GET |
| `app/api/customers/[id]/route.ts` | **Modify** | requireAuth on GET |
| `app/api/packages/route.ts` | **Modify** | requireAuth on POST; revalidatePath on POST |
| `app/api/packages/[id]/route.ts` | **Modify** | requireAuth on PUT/DELETE; revalidatePath on PUT/DELETE |
| `app/api/cities/route.ts` | **Modify** | requireAuth on POST; revalidatePath on POST |
| `app/api/cities/[id]/route.ts` | **Modify** | requireAuth on PUT/DELETE; revalidatePath on PUT/DELETE |
| `app/api/hotels/route.ts` | **Modify** | requireAuth on POST; revalidatePath on POST |
| `app/api/hotels/[id]/route.ts` | **Modify** | requireAuth on PUT/DELETE; revalidatePath on PUT/DELETE |
| `app/api/airlines/route.ts` | **Modify** | requireAuth on POST; revalidatePath on POST |
| `app/api/airlines/[id]/route.ts` | **Modify** | requireAuth on PUT/DELETE; revalidatePath on PUT/DELETE |
| `app/api/excursions/route.ts` | **Modify** | requireAuth on POST; revalidatePath on POST |
| `app/api/excursions/[id]/route.ts` | **Modify** | requireAuth on PUT/DELETE; revalidatePath on PUT/DELETE |
| `app/(dashboard)/bookings/page.tsx` | **Modify** | Replace bare new Date() with formatDate() |
| `app/(dashboard)/bookings/[id]/page.tsx` | **Modify** | Replace bare new Date() with formatDate() |
| `app/(dashboard)/customers/page.tsx` | **Modify** | Replace bare new Date() with formatDate() |

---

## Task 1: Install @upstash/redis and add environment variables

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Install the Upstash Redis client**

```bash
cd "C:\Users\haier\OneDrive - haiergroup\Documents\WH 2.0"
npm install @upstash/redis
```

Expected output: `added 1 package` (or similar — no errors)

- [ ] **Step 2: Create an Upstash Redis database**

1. Go to [console.upstash.com](https://console.upstash.com)
2. Click **Create Database** → name it `whholidays-cache` → select region closest to your WordPress server (e.g. `eu-west-1` if WP is in Europe) → **Create**
3. On the database page, copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**

- [ ] **Step 3: Add env vars to `.env.local`**

Open `.env.local` and append (replace the placeholder values with real ones from Upstash):

```env
# Upstash Redis Cache
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @upstash/redis"
```

(Do NOT commit `.env.local` — it's already in `.gitignore`)

---

## Task 2: Create `lib/cache.ts`

**Files:**
- Create: `lib/cache.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env automatically

const DEFAULT_TTL = 60 // seconds

/**
 * Read a value from Redis. Returns null on cache miss OR on Redis error
 * (graceful degradation — callers fall through to the live data source).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key)
  } catch (e) {
    console.warn('[cache] cacheGet failed', { key, error: String(e), ts: Date.now() })
    return null
  }
}

/**
 * Write a value to Redis with a TTL. Failures are logged but not thrown —
 * a failed cache write is non-fatal; the caller already has the live data.
 */
export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl })
  } catch (e) {
    console.warn('[cache] cacheSet failed', { key, error: String(e), ts: Date.now() })
  }
}

/**
 * Delete one or more keys from Redis. Used by mutation functions immediately
 * after a successful write so the next read fetches fresh data.
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch (e) {
    console.warn('[cache] cacheInvalidate failed', { keys, error: String(e), ts: Date.now() })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Cannot find module '@upstash/redis'`, confirm `npm install @upstash/redis` ran successfully.

- [ ] **Step 3: Commit**

```bash
git add lib/cache.ts
git commit -m "feat: add Upstash Redis cache module (cacheGet/cacheSet/cacheInvalidate)"
```

---

## Task 3: Create `lib/api-auth.ts`

**Files:**
- Create: `lib/api-auth.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/api-auth.ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api-auth.ts
git commit -m "feat: add requireAuth() API route guard"
```

---

## Task 4: Add `formatDate` to `lib/utils.ts` and fix date displays

**Files:**
- Modify: `lib/utils.ts`
- Modify: `app/(dashboard)/bookings/page.tsx`
- Modify: `app/(dashboard)/bookings/[id]/page.tsx`
- Modify: `app/(dashboard)/customers/page.tsx`

- [ ] **Step 1: Add `formatDate` to `lib/utils.ts`**

The file currently contains only `cn()`. Append `formatDate` after it:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a date string for display.
 * Handles: empty/null/undefined → "—"
 * Handles: Tour Master DD/MM/YYYY format
 * Handles: unparseable strings → returns the raw string unchanged
 */
export function formatDate(
  raw: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  if (!raw) return '—'

  // Normalise DD/MM/YYYY (Tour Master common format) → YYYY-MM-DD
  const parts = raw.split('/')
  const iso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : raw

  const d = new Date(iso)
  if (isNaN(d.getTime())) return raw // return raw string rather than "Invalid Date"

  return d.toLocaleDateString('en-GB', options)
}
```

- [ ] **Step 2: Fix `app/(dashboard)/bookings/page.tsx`**

Replace line 65 — change:
```tsx
<td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{new Date(b.booking_date).toLocaleDateString()}</td>
```
To:
```tsx
<td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{formatDate(b.booking_date)}</td>
```

Also add the import at the top of the file (after existing imports):
```tsx
import { formatDate } from '@/lib/utils'
```

- [ ] **Step 3: Fix `app/(dashboard)/bookings/[id]/page.tsx`**

Replace line 21 — change:
```tsx
{ label: 'Booking Date', value: new Date(booking.booking_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
```
To:
```tsx
{ label: 'Booking Date', value: formatDate(booking.booking_date, { year: 'numeric', month: 'long', day: 'numeric' }) },
```

Add import after existing imports:
```tsx
import { formatDate } from '@/lib/utils'
```

- [ ] **Step 4: Fix `app/(dashboard)/customers/page.tsx`**

Replace line 35 — change:
```tsx
<td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{new Date(c.enquiry_date).toLocaleDateString()}</td>
```
To:
```tsx
<td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{formatDate(c.enquiry_date)}</td>
```

Add import after existing imports:
```tsx
import { formatDate } from '@/lib/utils'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/utils.ts "app/(dashboard)/bookings/page.tsx" "app/(dashboard)/bookings/[id]/page.tsx" "app/(dashboard)/customers/page.tsx"
git commit -m "feat: add formatDate utility and fix unsafe date display in bookings/customers"
```

---

## Task 5: Update `lib/wp-client.ts` — cache integration

**Files:**
- Modify: `lib/wp-client.ts`

This task has three parts: (a) add `cache: 'no-store'` to `wpFetch`, (b) update `wpList` to use Redis, (c) add `cacheInvalidate` to every mutation function.

- [ ] **Step 1: Add `cache: 'no-store'` to `wpFetch` and import cache helpers**

At the top of `lib/wp-client.ts`, the imports currently end with the mock imports. Add the cache import after them:

```typescript
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache'
```

Then update `wpFetch` — add `cache: 'no-store'` as the last property so it always overrides any value in `init`:

```typescript
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
```

- [ ] **Step 2: Update `wpList` to accept a nullable cache key and use Redis**

Replace the current `wpList` function entirely:

```typescript
/**
 * Fetches a list endpoint.
 * - If cacheKey is non-null, checks Redis first (60s TTL).
 * - Always returns [] instead of throwing on error (graceful degradation).
 * - Pass cacheKey = null for filtered/parameterised calls that should bypass cache.
 */
async function wpList<T>(path: string, cacheKey: string | null): Promise<T[]> {
  // 1. Cache read (skip if key is null — filtered requests bypass cache)
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

    // 3. Populate cache (skip if key is null)
    if (cacheKey) await cacheSet(cacheKey, data)

    return data
  } catch (e) {
    console.warn('[wp-client]', { endpoint: path, error: String(e), ts: Date.now() })
    return []
  }
}
```

- [ ] **Step 3: Update all list-fetch functions to pass their cache key**

Replace each list function's `wpList` call to add the cache key argument:

```typescript
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
  // Bypass cache for filtered calls — results are too varied to cache usefully
  const hasFilters = !!(params?.search || params?.status)
  return wpList<Trip>(`/tours?${qs}`, hasFilters ? null : 'whh:tours')
}

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

export async function getCustomers(): Promise<Customer[]> {
  if (USE_MOCK) return [...mockCustomers]
  return wpList<Customer>('/customers', 'whh:customers')
}

export async function getPackages(): Promise<Package[]> {
  if (USE_MOCK) return [...mockPackages]
  return wpList<Package>('/packages', 'whh:packages')
}

export async function getCities(): Promise<City[]> {
  if (USE_MOCK) return [...mockCities]
  return wpList<City>('/cities', 'whh:cities')
}

export async function getHotels(): Promise<Hotel[]> {
  if (USE_MOCK) return [...mockHotels]
  return wpList<Hotel>('/hotels', 'whh:hotels')
}

export async function getAirlines(): Promise<Airline[]> {
  if (USE_MOCK) return [...mockAirlines]
  return wpList<Airline>('/airlines', 'whh:airlines')
}

export async function getExcursions(): Promise<Excursion[]> {
  if (USE_MOCK) return [...mockExcursions]
  return wpList<Excursion>('/excursions', 'whh:excursions')
}
```

- [ ] **Step 4: Add `cacheInvalidate` to all trip mutation functions**

Replace the three trip mutation functions:

```typescript
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
```

- [ ] **Step 5: Add `cacheInvalidate` to all package mutation functions**

```typescript
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
```

- [ ] **Step 6: Add `cacheInvalidate` to all city mutation functions**

```typescript
export async function createCity(data: CityInput): Promise<City> {
  if (USE_MOCK) {
    const city: City = { ...data, id: `city-${Date.now()}` }
    mockCities.push(city)
    return city
  }
  const res = await wpFetch('/cities', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
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
```

- [ ] **Step 7: Add `cacheInvalidate` to all hotel mutation functions**

```typescript
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
```

- [ ] **Step 8: Add `cacheInvalidate` to all airline mutation functions**

```typescript
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
```

- [ ] **Step 9: Add `cacheInvalidate` to all excursion mutation functions**

```typescript
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
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add lib/wp-client.ts
git commit -m "feat: integrate Redis cache into wp-client (wpList cache key, mutation invalidation, no-store fetch)"
```

---

## Task 6: Secure trips API routes + add `revalidatePath`

**Files:**
- Modify: `app/api/trips/route.ts`
- Modify: `app/api/trips/[id]/route.ts`

- [ ] **Step 1: Replace `app/api/trips/route.ts` entirely**

```typescript
import { NextResponse } from 'next/server'
import { getTrips, createTrip } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const trips = await getTrips({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return NextResponse.json(trips)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const trip = await createTrip(data)
    revalidatePath('/trips')
    return NextResponse.json(trip, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Replace `app/api/trips/[id]/route.ts` entirely**

```typescript
import { NextResponse } from 'next/server'
import { getTrip, updateTrip, deleteTrip } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const trip = await getTrip(params.id)
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const trip = await updateTrip(params.id, data)
    revalidatePath('/trips')
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteTrip(params.id)
    revalidatePath('/trips')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/trips/route.ts" "app/api/trips/[id]/route.ts"
git commit -m "feat: add requireAuth and revalidatePath to trips API routes"
```

---

## Task 7: Secure bookings and customers API routes

**Files:**
- Modify: `app/api/bookings/route.ts`
- Modify: `app/api/bookings/[id]/route.ts`
- Modify: `app/api/customers/route.ts`
- Modify: `app/api/customers/[id]/route.ts`

- [ ] **Step 1: Replace `app/api/bookings/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getBookings } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const { searchParams } = new URL(req.url)
    const bookings = await getBookings({ status: searchParams.get('status') ?? undefined })
    return NextResponse.json(bookings)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Replace `app/api/bookings/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getBooking } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const booking = await getBooking(params.id)
    return NextResponse.json(booking)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
```

- [ ] **Step 3: Replace `app/api/customers/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCustomers } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const customers = await getCustomers()
    return NextResponse.json(customers)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Replace `app/api/customers/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const customer = await getCustomer(params.id)
    return NextResponse.json(customer)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "app/api/bookings/route.ts" "app/api/bookings/[id]/route.ts" "app/api/customers/route.ts" "app/api/customers/[id]/route.ts"
git commit -m "feat: add requireAuth to bookings and customers API routes"
```

---

## Task 8: Secure packages API routes + `revalidatePath`

**Files:**
- Modify: `app/api/packages/route.ts`
- Modify: `app/api/packages/[id]/route.ts`

- [ ] **Step 1: Replace `app/api/packages/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getPackages, createPackage } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const packages = await getPackages()
    return NextResponse.json(packages)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const pkg = await createPackage(data)
    revalidatePath('/packages')
    return NextResponse.json(pkg, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Replace `app/api/packages/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getPackage, updatePackage, deletePackage } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const pkg = await getPackage(params.id)
    return NextResponse.json(pkg)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const pkg = await updatePackage(params.id, data)
    revalidatePath('/packages')
    return NextResponse.json(pkg)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deletePackage(params.id)
    revalidatePath('/packages')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit
git add "app/api/packages/route.ts" "app/api/packages/[id]/route.ts"
git commit -m "feat: add requireAuth and revalidatePath to packages API routes"
```

---

## Task 9: Secure library entity API routes (cities, hotels, airlines, excursions)

**Files:**
- Modify: `app/api/cities/route.ts`, `app/api/cities/[id]/route.ts`
- Modify: `app/api/hotels/route.ts`, `app/api/hotels/[id]/route.ts`
- Modify: `app/api/airlines/route.ts`, `app/api/airlines/[id]/route.ts`
- Modify: `app/api/excursions/route.ts`, `app/api/excursions/[id]/route.ts`

All 8 files follow the same pattern. `revalidatePath` is called with the entity's own list path — Redis cache invalidation (done in Task 5) handles freshness for the trip form's dropdowns.

- [ ] **Step 1: Replace `app/api/cities/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCities, createCity } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const cities = await getCities()
    return NextResponse.json(cities)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const city = await createCity(data)
    revalidatePath('/cities')
    return NextResponse.json(city, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Replace `app/api/cities/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCity, updateCity, deleteCity } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const city = await getCity(params.id)
    return NextResponse.json(city)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const city = await updateCity(params.id, data)
    revalidatePath('/cities')
    return NextResponse.json(city)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteCity(params.id)
    revalidatePath('/cities')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Replace `app/api/hotels/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getHotels, createHotel } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const hotels = await getHotels()
    return NextResponse.json(hotels)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const hotel = await createHotel(data)
    revalidatePath('/hotels')
    return NextResponse.json(hotel, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Replace `app/api/hotels/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getHotel, updateHotel, deleteHotel } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const hotel = await getHotel(params.id)
    return NextResponse.json(hotel)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const hotel = await updateHotel(params.id, data)
    revalidatePath('/hotels')
    return NextResponse.json(hotel)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteHotel(params.id)
    revalidatePath('/hotels')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 5: Replace `app/api/airlines/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getAirlines, createAirline } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const airlines = await getAirlines()
    return NextResponse.json(airlines)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const airline = await createAirline(data)
    revalidatePath('/airlines')
    return NextResponse.json(airline, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 6: Replace `app/api/airlines/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getAirline, updateAirline, deleteAirline } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const airline = await getAirline(params.id)
    return NextResponse.json(airline)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const airline = await updateAirline(params.id, data)
    revalidatePath('/airlines')
    return NextResponse.json(airline)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteAirline(params.id)
    revalidatePath('/airlines')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 7: Replace `app/api/excursions/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getExcursions, createExcursion } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const excursions = await getExcursions()
    return NextResponse.json(excursions)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const excursion = await createExcursion(data)
    revalidatePath('/excursions')
    return NextResponse.json(excursion, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 8: Replace `app/api/excursions/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getExcursion, updateExcursion, deleteExcursion } from '@/lib/wp-client'
import { requireAuth } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const excursion = await getExcursion(params.id)
    return NextResponse.json(excursion)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    const data = await req.json()
    const excursion = await updateExcursion(params.id, data)
    revalidatePath('/excursions')
    return NextResponse.json(excursion)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth) return auth
  try {
    await deleteExcursion(params.id)
    revalidatePath('/excursions')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 9: Final TypeScript check + commit**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
git add "app/api/cities/route.ts" "app/api/cities/[id]/route.ts" "app/api/hotels/route.ts" "app/api/hotels/[id]/route.ts" "app/api/airlines/route.ts" "app/api/airlines/[id]/route.ts" "app/api/excursions/route.ts" "app/api/excursions/[id]/route.ts"
git commit -m "feat: add requireAuth and revalidatePath to library entity API routes"
```

---

## Smoke Test Checklist

After all tasks are complete, run these manual checks:

- [ ] `npm run dev` starts without errors
- [ ] Visit `/trips` — loads the trip list (confirm no console errors)
- [ ] Open Upstash console → Data Browser → confirm `whh:tours` key appears with a ~60s TTL after the first page load
- [ ] Edit a trip and save → list page shows updated data immediately → `whh:tours` key is gone from Upstash (invalidated)
- [ ] In a new browser tab (not logged in), call `curl -X DELETE http://localhost:3000/api/trips/1` → should return `{"error":"Unauthorized"}` with status 401
- [ ] Visit `/bookings` — dates display correctly (no "Invalid Date" or crashes on empty dates)
- [ ] Visit `/customers` — same date check
