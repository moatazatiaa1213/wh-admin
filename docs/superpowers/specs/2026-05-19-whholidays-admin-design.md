# WHHolidays Admin — Design Spec

**Date:** 2026-05-19  
**Status:** Approved  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · jose  
**Deployment:** Vercel  

---

## 1. Project Overview

WHHolidays Admin is a private, single-admin dashboard for managing a WordPress-powered travel website (whholidays.com). It proxies the WP Travel Engine REST API behind Next.js API routes, adds JWT-based authentication, and presents a polished dark-mode UI for managing trips, bookings, customers, and packages.

The admin is the only user. There is no role system, user registration, or public-facing surface.

---

## 2. Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Data fetching | RSC-first + TanStack Query for mutations | Best perceived performance on Vercel; RSC owns initial render, TQ owns client mutations |
| Auth | JWT in httpOnly cookie, verified in middleware | Secure, stateless, works with Vercel Edge middleware |
| WP integration | Server-side proxy via Next.js API routes | Keeps WP credentials server-only; no CORS issues |
| Mock/real toggle | `USE_MOCK_DATA` env var in `lib/wp-client.ts` | Enables dev without live WP; zero refactor to go live |
| Dark mode | Always-on (no toggle) | Design decision: full dark-mode only, Uber-grade aesthetic |
| Deployment | Vercel | Zero-config Next.js 14, edge middleware, automatic previews |

---

## 3. Project Structure

```
whholidays-admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Login form (client component)
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Protected shell: sidebar + topbar (RSC)
│   │   ├── page.tsx                  # Overview / stats (RSC async)
│   │   ├── trips/
│   │   │   ├── page.tsx              # Trip list (RSC, URL-param search)
│   │   │   ├── new/page.tsx          # Create trip form (client)
│   │   │   └── [id]/
│   │   │       └── edit/page.tsx     # Edit trip form (client)
│   │   ├── bookings/
│   │   │   ├── page.tsx              # Booking list (RSC)
│   │   │   └── [id]/page.tsx         # Booking detail (RSC, read-only)
│   │   ├── customers/
│   │   │   ├── page.tsx              # Customer list (RSC)
│   │   │   └── [id]/page.tsx         # Customer profile (RSC, read-only)
│   │   └── packages/
│   │       ├── page.tsx              # Package list (RSC)
│   │       ├── new/page.tsx          # Create package form (client)
│   │       └── [id]/
│   │           └── edit/page.tsx     # Edit package form (client)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts        # POST: validate creds, issue JWT cookie
│   │   │   └── logout/route.ts       # POST: clear cookie
│   │   ├── trips/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/route.ts         # GET, PUT, DELETE
│   │   ├── bookings/
│   │   │   ├── route.ts              # GET list
│   │   │   └── [id]/route.ts         # GET detail
│   │   ├── customers/
│   │   │   ├── route.ts              # GET list
│   │   │   └── [id]/route.ts         # GET detail
│   │   └── packages/
│   │       ├── route.ts              # GET list, POST create
│   │       └── [id]/route.ts         # GET, PUT, DELETE
│   ├── globals.css                   # Tailwind base + dark theme CSS vars
│   └── layout.tsx                    # Root layout: Inter font, dark class on <html>
├── components/
│   ├── sidebar.tsx                   # Dark nav sidebar (client — active state)
│   ├── topbar.tsx                    # Page title + logout button
│   ├── data-table.tsx                # Reusable shadcn Table wrapper
│   ├── status-badge.tsx              # Semantic status badge (confirmed/pending/cancelled)
│   ├── trip-form.tsx                 # Shared create/edit trip form (client, TQ mutation)
│   └── package-form.tsx             # Shared create/edit package form (client, TQ mutation)
├── lib/
│   ├── wp-client.ts                  # Mock/real toggle + typed fetch helpers
│   ├── auth.ts                       # jose JWT sign/verify helpers
│   ├── types.ts                      # Trip, Booking, Customer, Package interfaces
│   ├── query-client.ts               # TanStack QueryClient singleton
│   └── mock/
│       ├── trips.ts                  # 10 realistic trip fixtures
│       ├── bookings.ts               # 15 realistic booking fixtures
│       ├── customers.ts              # 10 customer fixtures
│       └── packages.ts               # 12 package fixtures
├── middleware.ts                     # JWT verification, redirect to /login if invalid
├── .env.local.example                # All required env vars with descriptions
├── tailwind.config.ts                # Dark mode: 'class', custom colors
├── components.json                   # shadcn/ui config
└── next.config.ts                    # Next.js config
```

---

## 4. Authentication

### Login flow
1. User visits `/login` — a full-screen centered dark form (email + password).
2. Form submits `POST /api/auth/login` with `{ username, password }`.
3. API route checks `username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS`.
4. On match: signs a JWT with `new SignJWT({ sub: 'admin' }).setExpirationTime('8h').sign(secret)`.
5. Sets cookie: `auth_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`.
6. Returns `{ ok: true }` → client redirects to `/`.

### Middleware protection
- `middleware.ts` matches `/` and all sub-paths except `/login` and `/api/auth/*`.
- Reads `request.cookies.get('auth_token')?.value`.
- Calls `jwtVerify(token, secret)` — on failure or missing cookie, redirects to `/login`.
- On success, passes the request through unchanged.

### Logout
- `POST /api/auth/logout` sets `auth_token` with `Max-Age=0` to clear the cookie.
- Client redirects to `/login`.

---

## 5. WordPress Integration

### wp-client.ts

```typescript
// Checks USE_MOCK_DATA at import time
const USE_MOCK = process.env.USE_MOCK_DATA === 'true'

// All public functions fall through to mock or real depending on the flag:
export async function getTrips(): Promise<Trip[]>
export async function getTrip(id: string): Promise<Trip>
export async function createTrip(data: TripInput): Promise<Trip>
export async function updateTrip(id: string, data: TripInput): Promise<Trip>
export async function deleteTrip(id: string): Promise<void>
// ... same pattern for bookings, customers, packages
```

### Real WP fetch helper
```typescript
const wpFetch = (path: string, init?: RequestInit) =>
  fetch(`${process.env.WP_BASE_URL}/wp-json/wpte/v2${path}`, {
    ...init,
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
      ).toString('base64')}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
```

### WP Travel Engine endpoints
| Resource | Endpoint |
|---|---|
| Trips | `/wp-json/wpte/v2/trips` |
| Bookings | `/wp-json/wpte/v2/bookings` |
| Customers | `/wp-json/wpte/v2/enquiries` |
| Packages | `/wp-json/wpte/v2/packages` |

---

## 6. Module Specifications

### 6.1 Dashboard Overview (`/`)
- RSC fetches counts for trips, bookings, customers in parallel (`Promise.all`).
- 4 stat cards: Total Trips, Total Bookings, Total Customers, Total Packages.
- Recent Bookings table (last 5): customer name, trip, status badge, amount.
- Quick-action buttons: "+ New Trip", "+ New Package".
- No client JS required on this page.

### 6.2 Trips (`/trips`)
- **List page (RSC):** Reads `?search=` and `?status=` from `searchParams`. Passes to `getTrips({ search, status })`. Renders shadcn Table with columns: Title, Destination, Price, Duration, Status, Actions (Edit / Delete).
- **Status badge:** `draft` → amber, `published` → green.
- **Delete:** Client button opens shadcn AlertDialog for confirmation. TanStack `useMutation` calls `DELETE /api/trips/[id]`, then `router.refresh()`.
- **Create (`/trips/new`):** `TripForm` client component. TanStack `useMutation` calls `POST /api/trips`. On success, `router.push('/trips')`.
- **Edit (`/trips/[id]/edit`):** Page RSC pre-fetches the trip and passes as prop to `TripForm`. Mutation calls `PUT /api/trips/[id]`.

**Trip form fields:**
| Field | Type | Validation |
|---|---|---|
| Title | text input | required, min 3 chars |
| Description | textarea | required |
| Destination | text input | required |
| Price (USD) | number input | required, > 0 |
| Duration (days) | number input | required, integer > 0 |
| Featured Image URL | url input | optional |
| Status | select (draft / published) | required |

### 6.3 Bookings (`/bookings`)
- **List page (RSC):** Reads `?status=` filter. Columns: ID (mono font), Customer, Trip, Date, Status, Amount. Click row → navigate to detail.
- **Detail page (RSC, read-only):** Full booking info: customer details, trip details, booking date, status, amount, notes.
- No create/edit/delete — bookings come from WP only.

### 6.4 Customers (`/customers`)
- **List page (RSC):** Columns: Name, Email, Phone, Enquiry Date, Linked Trip.
- **Profile page (RSC, read-only):** Customer info + list of their enquiries/bookings.
- No create/edit/delete.

### 6.5 Packages (`/packages`)
- **List page (RSC):** Columns: Name, Linked Trip, Price, Max People, Actions (Edit / Delete).
- **Create/Edit:** `PackageForm` client component with TanStack mutation. Fields: Name, Price, Trip (select from trip list), Inclusions (textarea), Max People.
- Delete with confirmation dialog.

---

## 7. UI / Design System

### Color tokens (Tailwind CSS vars in `globals.css`)
```css
:root {
  --bg-base:    #09090b;   /* zinc-950 */
  --bg-surface: #111111;   /* slightly lighter */
  --bg-raised:  #18181b;   /* zinc-900 — hover states */
  --border:     #1c1c1c;   /* zinc-800 */
  --text-1:     #fafafa;   /* zinc-50 — primary */
  --text-2:     #a1a1aa;   /* zinc-400 — secondary */
  --text-3:     #52525b;   /* zinc-600 — muted */
  --accent:     #0ea5e9;   /* sky-500 */
  --success:    #22c55e;
  --warning:    #f59e0b;
  --danger:     #ef4444;
}
```

### shadcn/ui theme
- `baseColor: zinc`, `cssVariables: true`, dark mode always active via `class="dark"` on `<html>`.

### Typography
- Font: **Inter** (Google Fonts, `display: swap`).
- Page title: `text-lg font-bold tracking-tight text-zinc-50`.
- Table header: `text-[10px] font-semibold uppercase tracking-widest text-zinc-500`.
- Stat card value: `text-2xl font-bold tracking-tight`.
- Muted label: `text-xs text-zinc-500`.
- IDs and codes: `font-mono text-xs`.

### Component patterns
- **Sidebar:** Fixed width 220px, `bg-[#09090b]`, `border-r border-[#1c1c1c]`. Active item: `bg-zinc-900 text-zinc-50`. Inactive: `text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300`.
- **Cards:** `bg-[#111111] border border-[#1c1c1c] rounded-lg`.
- **Buttons:** Primary = `bg-sky-500 hover:bg-sky-600 text-white`. Destructive = `bg-transparent border border-red-900 text-red-400 hover:bg-red-950`.
- **Status badge component:** wraps shadcn `Badge` with variant mapping: `confirmed → success`, `pending → warning`, `cancelled → destructive`, `published → success`, `draft → warning`.
- **Transitions:** `transition-colors duration-150` on all interactive elements.
- **Focus:** `focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-0`.
- **Icons:** Lucide React, `size={16}`, never emoji.

### Layout
- Sidebar: fixed left, full height.
- Main area: `ml-[220px]`, padded `p-8`.
- Max content width: `max-w-7xl mx-auto`.
- Topbar: sticky, `bg-[#09090b]/80 backdrop-blur border-b border-[#1c1c1c]`.

---

## 8. Environment Variables

```bash
# Authentication
ADMIN_USER=admin
ADMIN_PASS=your-secure-password-here
JWT_SECRET=your-256-bit-secret-here

# WordPress Integration
WP_BASE_URL=https://whholidays.com
WP_USERNAME=your-wp-username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Feature Flags
USE_MOCK_DATA=true   # Set to false to use real WP API
```

---

## 9. Error Handling

- **WP API failure:** API routes catch fetch errors and return `{ error: string }` with appropriate HTTP status. Pages display an inline error state (not a crash).
- **JWT invalid/expired:** Middleware redirects to `/login`. Login page shows no error (silent redirect).
- **Form validation:** React Hook Form + zod schema validation client-side. Server-side validation in API routes as a second layer.
- **404:** Next.js default `not-found.tsx` styled to match dark theme.
- **Loading states:** shadcn `Skeleton` on list pages while RSC is streaming. `isPending` disables submit buttons during TQ mutations.

---

## 10. Non-Goals (explicitly out of scope)

- Multi-user / role-based access — single admin only.
- Real-time updates / WebSockets.
- Analytics charts / graphs.
- Email notifications.
- Image upload (image URL field only).
- Dark/light mode toggle — always dark.
- Testing setup (can be added later).
