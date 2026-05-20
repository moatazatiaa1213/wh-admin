# WHHolidays Admin — Redis Cache + Critical Fixes Design

**Date:** 2026-05-19  
**Scope:** Upstash Redis caching layer for all WordPress API list calls, plus five critical fixes identified during audit  
**Deployment target:** Vercel  
**Cache strategy:** Near-real-time (60-second TTL on all list endpoints, immediate invalidation on writes)

---

## 1. Critical Fixes (bundled with cache implementation)

These issues exist today and must be resolved in the same implementation pass.

### 1.1 API Routes Have No Authentication (🔴 Critical)

**Problem:** All `app/api/*` route handlers call WordPress and mutate data but perform no auth check. Any unauthenticated HTTP client can `DELETE /api/trips/123` or `POST /api/bookings`.

**Fix:** Create `lib/api-auth.ts` with a `requireAuth(request)` helper that reads the `auth_token` cookie, verifies the JWT with `jose`, and returns a `NextResponse` 401 if invalid. Every route handler calls this at the top before doing any work.

```typescript
// lib/api-auth.ts
export async function requireAuth(req: Request): Promise<NextResponse | null>
// Returns null if authenticated (caller continues), or a 401 NextResponse to return immediately
```

Apply to: all files under `app/api/trips/`, `app/api/bookings/`, `app/api/customers/`, `app/api/packages/`, `app/api/cities/`, `app/api/hotels/`, `app/api/airlines/`, `app/api/excursions/`.

### 1.2 Next.js Silently Caches `fetch()` in Production (🔴 Critical)

**Problem:** `wpFetch()` in `lib/wp-client.ts` does not set `cache: 'no-store'`. In Next.js 14 production builds, `fetch()` responses are cached indefinitely by the Data Cache, so trips/bookings pages can show hours-old data after writes.

**Fix:** Add `cache: 'no-store'` to the base `fetch()` call in `wpFetch()`. The Redis layer (section 3) then provides controlled caching instead.

### 1.3 No `revalidatePath` After Mutations (🟠 High)

**Problem:** When a trip or library item is saved via the dashboard form, the mutation API route writes to WordPress but never tells Next.js to re-render the affected RSC pages. The list page stays stale until the server restarts or the RSC cache expires.

**Fix:** Call `revalidatePath('/trips')` (and the relevant entity path) inside each mutation API route handler after a successful write. This combines with cache invalidation (section 3.3) to give immediate freshness.

### 1.4 `new Date()` Crashes on Empty or Malformed Strings (🟡 Medium)

**Problem:** `bookings/page.tsx` and `customers/page.tsx` call `new Date(b.booking_date).toLocaleDateString()` directly. Tour Master sometimes returns empty strings or non-standard formats, producing "Invalid Date" in the UI.

**Fix:** Add a `formatDate(raw: string): string` utility to `lib/utils.ts` that:
- Returns `'—'` for empty/null/undefined strings
- Converts `DD/MM/YYYY` to ISO before parsing (Tour Master's common format)
- Returns the raw string unchanged if `Date` still cannot parse it
- Otherwise returns a formatted locale string

Replace all bare `new Date(...).toLocaleDateString()` calls in bookings and customers pages with `formatDate(...)`.

### 1.5 `fetch` in `wpList` Can Throw Unhandled Network Errors (🟡 Medium)

**Problem:** `wpList()` has a try/catch that returns `[]` on fetch failure, but the error is only `console.warn`'d — no visibility in production.

**Fix:** Keep the silent fallback behaviour (returning `[]` is correct so the page renders), but log structured errors: `{ endpoint: path, status: res.status, ts: Date.now() }`. This gives Vercel log searchability without crashing the page.

---

## 2. New Environment Variables

Add to `.env.local` (and Vercel project settings):

```env
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-token>
```

Both are available from the Upstash dashboard after creating a Redis database, or auto-populated via the Vercel ↔ Upstash integration (Settings → Integrations → Upstash).

---

## 3. Cache Module — `lib/cache.ts`

A thin typed wrapper around `@upstash/redis`. Exposes exactly three functions.

```typescript
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()  // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
const PREFIX = 'whh:'
const DEFAULT_TTL_SECONDS = 60

export async function cacheGet<T>(key: string): Promise<T | null>
export async function cacheSet<T>(key: string, value: T, ttl?: number): Promise<void>
export async function cacheInvalidate(...keys: string[]): Promise<void>
```

**Key naming convention:** all keys are prefixed `whh:` to avoid collisions if the Upstash database is shared with other apps.

**Cache key registry:**

| Key | Populated by | Invalidated by |
|-----|-------------|----------------|
| `whh:tours` | `getTrips()` | `createTrip`, `updateTrip`, `deleteTrip` |
| `whh:cities` | `getCities()` | `createCity`, `updateCity`, `deleteCity` |
| `whh:hotels` | `getHotels()` | `createHotel`, `updateHotel`, `deleteHotel` |
| `whh:airlines` | `getAirlines()` | `createAirline`, `updateAirline`, `deleteAirline` |
| `whh:excursions` | `getExcursions()` | `createExcursion`, `updateExcursion`, `deleteExcursion` |
| `whh:packages` | `getPackages()` | `createPackage`, `updatePackage`, `deletePackage` |
| `whh:bookings` | `getBookings()` | *(read-only — auto-expires at 60s)* |
| `whh:customers` | `getCustomers()` | *(read-only — auto-expires at 60s)* |

**What is NOT cached:**
- Single-item fetches: `getTrip(id)`, `getBooking(id)`, `getCustomer(id)`, `getCity(id)`, etc. — these are used only on edit/detail pages where fresh data is required
- Write operations: `createXxx`, `updateXxx`, `deleteXxx` — always hit WordPress directly

**Error handling in cache layer:**
- `cacheGet` catches Redis errors and returns `null` (triggers a cache miss, falls through to WordPress — degrades gracefully)
- `cacheSet` catches Redis errors and logs them but does not throw (a failed write is non-fatal)
- `cacheInvalidate` catches Redis errors and logs them (worst case: stale data for up to 60s, then auto-expires)

---

## 4. Integration with `lib/wp-client.ts`

### 4.1 Updated `wpList` signature

```typescript
async function wpList<T>(path: string, cacheKey: string | null): Promise<T[]>
```

`cacheKey` is `null` for filtered/parameterised calls — in that case the cache is bypassed entirely and WordPress is hit directly.

Flow:
1. If `cacheKey` is non-null: `cacheGet(cacheKey)` — if hit, return immediately
2. `fetch` from WordPress (with `cache: 'no-store'`)
3. On success and `cacheKey` non-null: `cacheSet(cacheKey, data, 60)`, return data
4. On non-2xx: log warning, return `[]`
5. On network error: log warning, return `[]`

### 4.2 All list functions pass their cache key

```typescript
// For filtered calls (search/status params present), skip the cache entirely —
// the trip list page is the only consumer and filtered results are too varied to cache usefully.
// Unfiltered calls use the cache key.
export async function getTrips(params?) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  const hasFilters = params?.search || params?.status
  return wpList<Trip>(`/tours?${qs}`, hasFilters ? null : 'whh:tours')
}

// Bookings can be filtered by status — same rule: only cache unfiltered
export async function getBookings(params?) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  return wpList<Booking>(`/bookings?${qs}`, params?.status ? null : 'whh:bookings')
}
export async function getCustomers()     { return wpList<Customer>('/customers', 'whh:customers') }
export async function getPackages()      { return wpList<Package>('/packages', 'whh:packages') }
export async function getCities()        { return wpList<City>('/cities', 'whh:cities') }
export async function getHotels()        { return wpList<Hotel>('/hotels', 'whh:hotels') }
export async function getAirlines()      { return wpList<Airline>('/airlines', 'whh:airlines') }
export async function getExcursions()    { return wpList<Excursion>('/excursions', 'whh:excursions') }
```

### 4.3 All mutation functions invalidate on success

```typescript
export async function createTrip(data: TripInput): Promise<Trip> {
  const res = await wpFetch('/tours', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`WP API error: ${res.status}`)
  await cacheInvalidate('whh:tours')
  return res.json()
}
// Same pattern for updateTrip, deleteTrip, and all library entities
```

---

## 5. API Route Auth Guard — `lib/api-auth.ts`

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function requireAuth(req: Request): Promise<NextResponse | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await verifyToken(token)
    return null  // authenticated — caller continues
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

Usage pattern in every route handler:

```typescript
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth) return auth  // 401 response
  // ... rest of handler
}
```

---

## 6. `revalidatePath` in Mutation API Routes

After every successful write, call `revalidatePath` for the affected section:

| Route | `revalidatePath` call |
|-------|----------------------|
| `POST /api/trips` | `revalidatePath('/trips')` |
| `PUT /api/trips/[id]` | `revalidatePath('/trips')`, `revalidatePath('/trips/[id]/edit')` |
| `DELETE /api/trips/[id]` | `revalidatePath('/trips')` |
| `POST /api/cities` | `revalidatePath('/cities')` |
| `PUT /api/cities/[id]` | `revalidatePath('/cities')`, `revalidatePath('/trips/new')` |
| *(and so on for hotels, airlines, excursions, packages)* | |

`revalidatePath('/trips/new')` and `revalidatePath('/trips/[id]/edit')` are included for city/hotel/airline/excursion mutations because the trip form fetches all four library lists to populate its multi-select dropdowns.

---

## 7. `formatDate` Utility

Added to `lib/utils.ts`:

```typescript
export function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  // Normalise DD/MM/YYYY (Tour Master common format) to YYYY-MM-DD
  const parts = raw.split('/')
  const iso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : raw
  const d = new Date(iso)
  if (isNaN(d.getTime())) return raw  // return raw rather than "Invalid Date"
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
```

---

## 8. New Dependency

```bash
npm install @upstash/redis
```

No other dependencies. `@upstash/redis` uses the Upstash REST API over HTTPS — no TCP connection pool, no Redis binary protocol, works natively in Vercel Edge and serverless functions.

---

## 9. Files Changed Summary

| File | Change |
|------|--------|
| `package.json` | Add `@upstash/redis` |
| `.env.local` | Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| `lib/cache.ts` | **New** — Redis wrapper (cacheGet, cacheSet, cacheInvalidate) |
| `lib/api-auth.ts` | **New** — requireAuth() helper for route handlers |
| `lib/utils.ts` | Add `formatDate()` |
| `lib/wp-client.ts` | Add cache key param to wpList, add cacheInvalidate to all mutations, add `cache: 'no-store'` to wpFetch |
| `app/api/trips/route.ts` | Add requireAuth, revalidatePath |
| `app/api/trips/[id]/route.ts` | Add requireAuth, revalidatePath |
| `app/api/bookings/route.ts` | Add requireAuth |
| `app/api/bookings/[id]/route.ts` | Add requireAuth |
| `app/api/customers/route.ts` | Add requireAuth |
| `app/api/customers/[id]/route.ts` | Add requireAuth |
| `app/api/packages/route.ts` | Add requireAuth, revalidatePath |
| `app/api/packages/[id]/route.ts` | Add requireAuth, revalidatePath |
| `app/api/cities/route.ts` | Add requireAuth, revalidatePath |
| `app/api/cities/[id]/route.ts` | Add requireAuth, revalidatePath |
| `app/api/hotels/route.ts` | Add requireAuth, revalidatePath |
| `app/api/hotels/[id]/route.ts` | Add requireAuth, revalidatePath |
| `app/api/airlines/route.ts` | Add requireAuth, revalidatePath |
| `app/api/airlines/[id]/route.ts` | Add requireAuth, revalidatePath |
| `app/api/excursions/route.ts` | Add requireAuth, revalidatePath |
| `app/api/excursions/[id]/route.ts` | Add requireAuth, revalidatePath |
| `app/(dashboard)/bookings/page.tsx` | Replace bare `new Date(...)` with `formatDate(...)` |
| `app/(dashboard)/customers/page.tsx` | Replace bare `new Date(...)` with `formatDate(...)` |

---

## 10. Out of Scope

- Rate limiting on API routes (separate concern, can be added via Vercel middleware later)
- Pagination on list endpoints (WordPress returns up to 200 records; sufficient for current scale)
- Real-time push / WebSockets (60s TTL is sufficient for a 1–2 admin dashboard)
- Upstash Redis Analytics / metrics dashboard setup
