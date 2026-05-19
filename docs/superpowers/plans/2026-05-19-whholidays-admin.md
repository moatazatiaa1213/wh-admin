# WHHolidays Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Next.js 14 App Router admin dashboard for managing a WordPress travel website, with JWT auth, dark mode UI, and a mock/real WP API toggle.

**Architecture:** RSC-first data fetching — pages are async Server Components that fetch from internal API routes. TanStack Query handles client-side mutations (create/edit/delete) and calls `router.refresh()` to re-run the RSC after changes. A `USE_MOCK_DATA` env var switches between realistic mock fixtures and the live WP Travel Engine REST API with zero code changes.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · jose · React Hook Form · Zod · Lucide React

**Project root:** `C:/Users/haier/OneDrive - haiergroup/Documents/WH 2.0/`

---

## File Map

```
.
├── app/
│   ├── layout.tsx                          # Root layout, Inter font, dark class
│   ├── globals.css                         # Tailwind + design tokens
│   ├── not-found.tsx                       # Dark 404 page
│   ├── (auth)/login/page.tsx               # Login page (client)
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # Shell: sidebar + topbar
│   │   ├── page.tsx                        # Overview stats (RSC)
│   │   ├── trips/page.tsx                  # Trip list (RSC)
│   │   ├── trips/new/page.tsx              # Create trip
│   │   ├── trips/[id]/edit/page.tsx        # Edit trip
│   │   ├── bookings/page.tsx               # Booking list (RSC)
│   │   ├── bookings/[id]/page.tsx          # Booking detail (RSC)
│   │   ├── customers/page.tsx              # Customer list (RSC)
│   │   ├── customers/[id]/page.tsx         # Customer profile (RSC)
│   │   ├── packages/page.tsx               # Package list (RSC)
│   │   ├── packages/new/page.tsx           # Create package
│   │   └── packages/[id]/edit/page.tsx     # Edit package
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       ├── trips/route.ts
│       ├── trips/[id]/route.ts
│       ├── bookings/route.ts
│       ├── bookings/[id]/route.ts
│       ├── customers/route.ts
│       ├── customers/[id]/route.ts
│       ├── packages/route.ts
│       └── packages/[id]/route.ts
├── components/
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   ├── status-badge.tsx
│   ├── data-table.tsx
│   ├── trip-form.tsx
│   ├── package-form.tsx
│   └── providers.tsx                       # TanStack QueryClientProvider
├── lib/
│   ├── types.ts
│   ├── auth.ts
│   ├── query-client.ts
│   ├── wp-client.ts
│   └── mock/
│       ├── trips.ts
│       ├── bookings.ts
│       ├── customers.ts
│       └── packages.ts
├── middleware.ts
├── .env.local.example
├── tailwind.config.ts
└── components.json
```

---

## Task 1: Project Scaffold

**Files:** `package.json`, `tailwind.config.ts`, `components.json`, `next.config.ts`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Scaffold Next.js 14 app**

Run in the project root (the directory already exists):
```bash
cd "C:/Users/haier/OneDrive - haiergroup/Documents/WH 2.0"
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*" --yes
```
Expected: Files created including `app/`, `package.json`, `tailwind.config.ts`.

- [ ] **Step 2: Install additional dependencies**

```bash
cd "C:/Users/haier/OneDrive - haiergroup/Documents/WH 2.0"
npm install @tanstack/react-query @tanstack/react-query-devtools jose lucide-react react-hook-form @hookform/resolvers zod
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init --yes --base-color zinc --css-variables
```

When prompted for style: `Default`. Base color: `Zinc`. CSS variables: `yes`.

- [ ] **Step 4: Add all required shadcn components**

```bash
npx shadcn@latest add button input label textarea select badge dialog alert-dialog table skeleton separator dropdown-menu
```

- [ ] **Step 5: Replace `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

- [ ] **Step 6: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 199 89% 48%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 11%;
    --input: 240 3.7% 11%;
    --ring: 199 89% 48%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}
```

- [ ] **Step 7: Create `.env.local.example`**

```bash
# Authentication
ADMIN_USER=admin
ADMIN_PASS=your-secure-password-here
JWT_SECRET=generate-with-openssl-rand-base64-32

# WordPress Integration
WP_BASE_URL=https://whholidays.com
WP_USERNAME=your-wp-username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Feature Flags
# Set to "true" to use mock data instead of live WP API
USE_MOCK_DATA=true
```

- [ ] **Step 8: Create `.env.local` from example and add to `.gitignore`**

```bash
cp .env.local.example .env.local
```

Ensure `.gitignore` contains:
```
.env.local
.superpowers/
```

- [ ] **Step 9: Add `tailwindcss-animate` (required by shadcn)**

```bash
npm install tailwindcss-animate
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```
Expected: `✓ Ready on http://localhost:3000` with no TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 + shadcn/ui + dependencies"
```

---

## Task 2: Core Types

**Files:** `lib/types.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export interface Trip {
  id: string
  title: string
  description: string
  destination: string
  price: number
  duration: number        // days
  featured_image?: string
  status: 'draft' | 'published'
  created_at: string
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add core TypeScript types"
```

---

## Task 3: Auth Library

**Files:** `lib/auth.ts`

- [ ] **Step 1: Create `lib/auth.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose'

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: { sub: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as { sub: string }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: add jose JWT sign/verify helpers"
```

---

## Task 4: Mock Data

**Files:** `lib/mock/trips.ts`, `lib/mock/bookings.ts`, `lib/mock/customers.ts`, `lib/mock/packages.ts`

- [ ] **Step 1: Create `lib/mock/trips.ts`**

```ts
import { Trip } from '@/lib/types'

export const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    title: 'Hunza Valley Explorer',
    description: 'A breathtaking 7-day journey through the stunning Hunza Valley with visits to Attabad Lake, Baltit Fort, and Eagle\'s Nest viewpoint.',
    destination: 'Hunza, Gilgit-Baltistan',
    price: 1200,
    duration: 7,
    featured_image: 'https://images.unsplash.com/photo-1585211969224-3e992986159d?w=800',
    status: 'published',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'trip-2',
    title: 'Swat Valley Serenity',
    description: 'Experience the lush green valleys and crystal-clear rivers of Swat over 5 days. Visit Malam Jabba, Kalam, and Mahodand Lake.',
    destination: 'Swat, KPK',
    price: 890,
    duration: 5,
    featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    status: 'published',
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'trip-3',
    title: 'Skardu Expedition',
    description: 'An epic 10-day adventure to Skardu with visits to Shangrila Resort, Satpara Lake, and the mighty Deosai Plains.',
    destination: 'Skardu, Gilgit-Baltistan',
    price: 2100,
    duration: 10,
    featured_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    status: 'published',
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'trip-4',
    title: 'Fairy Meadows Trek',
    description: 'A 4-day trek to the world-famous Fairy Meadows at the base of Nanga Parbat, the ninth-highest mountain in the world.',
    destination: 'Fairy Meadows, Diamer',
    price: 750,
    duration: 4,
    status: 'published',
    created_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'trip-5',
    title: 'Kalash Valley Cultural Tour',
    description: 'Immerse yourself in the unique culture of the Kalash people over 5 days in the remote valleys of Chitral.',
    destination: 'Kalash Valleys, Chitral',
    price: 980,
    duration: 5,
    status: 'draft',
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'trip-6',
    title: 'Neelum Valley Retreat',
    description: 'Discover the turquoise waters and dense forests of Neelum Valley in Azad Kashmir over 6 relaxing days.',
    destination: 'Neelum Valley, AJK',
    price: 1050,
    duration: 6,
    status: 'published',
    created_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'trip-7',
    title: 'K2 Base Camp Trek',
    description: 'The ultimate Pakistani trekking experience — 14 days to the base of K2, the world\'s second highest mountain.',
    destination: 'Concordia, Gilgit-Baltistan',
    price: 3500,
    duration: 14,
    status: 'draft',
    created_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'trip-8',
    title: 'Lahore Heritage Walk',
    description: 'A 3-day deep dive into Lahore\'s Mughal history — Badshahi Mosque, Lahore Fort, Shalimar Gardens.',
    destination: 'Lahore, Punjab',
    price: 450,
    duration: 3,
    status: 'published',
    created_at: '2026-04-10T10:00:00Z',
  },
]
```

- [ ] **Step 2: Create `lib/mock/bookings.ts`**

```ts
import { Booking } from '@/lib/types'

export const mockBookings: Booking[] = [
  { id: 'bk-001', customer_name: 'Sara Ahmed', customer_email: 'sara@example.com', trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', booking_date: '2026-05-10T09:00:00Z', status: 'confirmed', amount: 1200, notes: 'Vegetarian meals required.' },
  { id: 'bk-002', customer_name: 'Tariq Khan', customer_email: 'tariq@example.com', trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', booking_date: '2026-05-12T11:00:00Z', status: 'pending', amount: 890 },
  { id: 'bk-003', customer_name: 'Nadia Iqbal', customer_email: 'nadia@example.com', trip_id: 'trip-3', trip_title: 'Skardu Expedition', booking_date: '2026-05-08T14:00:00Z', status: 'cancelled', amount: 2100, notes: 'Cancelled due to medical emergency.' },
  { id: 'bk-004', customer_name: 'Ali Raza', customer_email: 'ali@example.com', trip_id: 'trip-4', trip_title: 'Fairy Meadows Trek', booking_date: '2026-05-14T10:00:00Z', status: 'confirmed', amount: 750 },
  { id: 'bk-005', customer_name: 'Fatima Malik', customer_email: 'fatima@example.com', trip_id: 'trip-6', trip_title: 'Neelum Valley Retreat', booking_date: '2026-05-15T09:30:00Z', status: 'confirmed', amount: 1050 },
  { id: 'bk-006', customer_name: 'Usman Baig', customer_email: 'usman@example.com', trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', booking_date: '2026-05-16T11:00:00Z', status: 'pending', amount: 1200 },
  { id: 'bk-007', customer_name: 'Hina Shah', customer_email: 'hina@example.com', trip_id: 'trip-8', trip_title: 'Lahore Heritage Walk', booking_date: '2026-05-17T10:00:00Z', status: 'confirmed', amount: 450 },
  { id: 'bk-008', customer_name: 'Bilal Chaudhry', customer_email: 'bilal@example.com', trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', booking_date: '2026-05-18T14:00:00Z', status: 'pending', amount: 890 },
]
```

- [ ] **Step 3: Create `lib/mock/customers.ts`**

```ts
import { Customer } from '@/lib/types'

export const mockCustomers: Customer[] = [
  { id: 'cust-1', name: 'Sara Ahmed', email: 'sara@example.com', phone: '+92 300 1234567', trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', enquiry_date: '2026-05-09T09:00:00Z' },
  { id: 'cust-2', name: 'Tariq Khan', email: 'tariq@example.com', phone: '+92 321 9876543', trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', enquiry_date: '2026-05-11T11:00:00Z' },
  { id: 'cust-3', name: 'Nadia Iqbal', email: 'nadia@example.com', phone: '+92 333 5551234', trip_id: 'trip-3', trip_title: 'Skardu Expedition', enquiry_date: '2026-05-07T14:00:00Z' },
  { id: 'cust-4', name: 'Ali Raza', email: 'ali@example.com', phone: '+92 345 7778899', trip_id: 'trip-4', trip_title: 'Fairy Meadows Trek', enquiry_date: '2026-05-13T10:00:00Z' },
  { id: 'cust-5', name: 'Fatima Malik', email: 'fatima@example.com', phone: '+92 312 4445566', trip_id: 'trip-6', trip_title: 'Neelum Valley Retreat', enquiry_date: '2026-05-14T09:30:00Z' },
  { id: 'cust-6', name: 'Usman Baig', email: 'usman@example.com', trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', enquiry_date: '2026-05-15T11:00:00Z' },
  { id: 'cust-7', name: 'Hina Shah', email: 'hina@example.com', phone: '+92 300 9998877', trip_id: 'trip-8', trip_title: 'Lahore Heritage Walk', enquiry_date: '2026-05-16T10:00:00Z' },
  { id: 'cust-8', name: 'Bilal Chaudhry', email: 'bilal@example.com', phone: '+92 321 1112233', trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', enquiry_date: '2026-05-17T14:00:00Z' },
]
```

- [ ] **Step 4: Create `lib/mock/packages.ts`**

```ts
import { Package } from '@/lib/types'

export const mockPackages: Package[] = [
  { id: 'pkg-1', name: 'Hunza Standard', price: 1200, trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', inclusions: 'Hotel accommodation, breakfast & dinner, transport, guide', max_people: 10, created_at: '2026-01-15T10:00:00Z' },
  { id: 'pkg-2', name: 'Hunza Premium', price: 1800, trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', inclusions: 'Luxury hotel, all meals, private transport, professional guide, photography', max_people: 6, created_at: '2026-01-15T10:00:00Z' },
  { id: 'pkg-3', name: 'Swat Standard', price: 890, trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', inclusions: 'Hotel, breakfast, transport, guide', max_people: 12, created_at: '2026-01-20T10:00:00Z' },
  { id: 'pkg-4', name: 'Skardu Adventure', price: 2100, trip_id: 'trip-3', trip_title: 'Skardu Expedition', inclusions: 'All accommodation, all meals, jeep transport, trekking equipment, guide', max_people: 8, created_at: '2026-02-01T10:00:00Z' },
  { id: 'pkg-5', name: 'Fairy Meadows Trek', price: 750, trip_id: 'trip-4', trip_title: 'Fairy Meadows Trek', inclusions: 'Camping equipment, meals, guide, jeep to trailhead', max_people: 10, created_at: '2026-02-10T10:00:00Z' },
]
```

- [ ] **Step 5: Commit**

```bash
git add lib/mock/
git commit -m "feat: add realistic mock data fixtures"
```

---

## Task 5: WordPress Client

**Files:** `lib/wp-client.ts`

- [ ] **Step 1: Create `lib/wp-client.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/wp-client.ts
git commit -m "feat: add wp-client with mock/real toggle"
```

---

## Task 6: Auth API Routes + Middleware

**Files:** `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `middleware.ts`

- [ ] **Step 1: Create `app/api/auth/login/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (
      username !== process.env.ADMIN_USER ||
      password !== process.env.ADMIN_PASS
    ) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({ sub: 'admin' })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
```

- [ ] **Step 3: Create `middleware.ts`**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Verify login API manually**

Start dev server (`npm run dev`) and run:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-secure-password-here"}' \
  -v 2>&1 | grep -E "Set-Cookie|HTTP"
```
Expected: `HTTP/1.1 200 OK` and `Set-Cookie: auth_token=...`

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/ middleware.ts
git commit -m "feat: auth API routes and JWT middleware"
```

---

## Task 7: Root Layout + Login Page

**Files:** `app/layout.tsx`, `app/(auth)/login/page.tsx`, `lib/query-client.ts`, `components/providers.tsx`

- [ ] **Step 1: Create `lib/query-client.ts`**

```ts
import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
```

- [ ] **Step 2: Create `components/providers.tsx`**

```tsx
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'WHHolidays Admin',
  description: 'Admin dashboard for WHHolidays travel platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Create `app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plane } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        setError('Invalid username or password.')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
            <Plane size={18} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-zinc-50 leading-none">WHHolidays</p>
            <p className="text-xs text-zinc-500 mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#1c1c1c] rounded-xl p-6">
          <h1 className="text-lg font-semibold text-zinc-50 mb-1">Sign in</h1>
          <p className="text-sm text-zinc-500 mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-zinc-400">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium transition-colors duration-150 cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify login page renders**

Visit `http://localhost:3000/login` — should show dark login form. Navigating to `http://localhost:3000/` should redirect to `/login`.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/(auth)/ components/providers.tsx lib/query-client.ts
git commit -m "feat: root layout, providers, and login page"
```

---

## Task 8: Dashboard Shell

**Files:** `components/sidebar.tsx`, `components/topbar.tsx`, `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `components/sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  BookOpen,
  Users,
  Package,
  Plane,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/trips', label: 'Trips', icon: Globe },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/packages', label: 'Packages', icon: Package },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#09090b] border-r border-[#1c1c1c] flex flex-col z-30">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1c1c1c]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-sky-500 flex items-center justify-center flex-shrink-0">
            <Plane size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-50 leading-none tracking-tight">WHHolidays</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-2 pb-2">
          Main
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
              isActive(href)
                ? 'bg-zinc-900 text-zinc-50'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <Icon size={15} className={isActive(href) ? 'text-sky-500' : 'text-zinc-600'} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#1c1c1c]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-300 truncate">Admin</p>
            <p className="text-[10px] text-zinc-600 truncate">WHHolidays</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `components/topbar.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopbarProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function Topbar({ title, subtitle, action }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-lg font-bold text-zinc-50 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 cursor-pointer transition-colors duration-150"
        >
          <LogOut size={15} className="mr-1.5" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/layout.tsx`**

```tsx
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Sidebar />
      <main className="ml-[220px] min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Verify shell renders**

Log in at `/login` with the credentials from `.env.local`. You should be redirected to `/` and see the dark sidebar with navigation items.

- [ ] **Step 5: Commit**

```bash
git add components/sidebar.tsx components/topbar.tsx app/(dashboard)/layout.tsx
git commit -m "feat: dashboard shell with sidebar and topbar"
```

---

## Task 9: Shared UI Components

**Files:** `components/status-badge.tsx`, `components/data-table.tsx`

- [ ] **Step 1: Create `components/status-badge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'

type Status = 'confirmed' | 'pending' | 'cancelled' | 'published' | 'draft'

const config: Record<Status, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-950/60 text-green-400 border border-green-900/50 hover:bg-green-950/60',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-950/60 text-amber-400 border border-amber-900/50 hover:bg-amber-950/60',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-950/60 text-red-400 border border-red-900/50 hover:bg-red-950/60',
  },
  published: {
    label: 'Published',
    className: 'bg-green-950/60 text-green-400 border border-green-900/50 hover:bg-green-950/60',
  },
  draft: {
    label: 'Draft',
    className: 'bg-amber-950/60 text-amber-400 border border-amber-900/50 hover:bg-amber-950/60',
  },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  }
  return (
    <Badge className={`text-[10px] font-semibold px-2 py-0.5 rounded ${className}`}>
      {label}
    </Badge>
  )
}
```

- [ ] **Step 2: Create `components/data-table.tsx`**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, emptyMessage = 'No results.' }: DataTableProps<T>) {
  return (
    <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#1c1c1c] hover:bg-transparent">
            {columns.map(col => (
              <TableHead
                key={col.key}
                className={`text-[10px] font-semibold uppercase tracking-widest text-zinc-500 py-3 ${col.className ?? ''}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="border-[#1c1c1c]">
              <TableCell
                colSpan={columns.length}
                className="text-center text-zinc-500 text-sm py-12"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={i} className="border-[#1c1c1c] hover:bg-zinc-900/40 transition-colors duration-100">
                {columns.map(col => (
                  <TableCell key={col.key} className={`py-3 text-sm ${col.className ?? ''}`}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/status-badge.tsx components/data-table.tsx
git commit -m "feat: shared StatusBadge and DataTable components"
```

---

## Task 10: Overview Page + All API Routes

**Files:** `app/(dashboard)/page.tsx`, all `app/api/*/route.ts` files

- [ ] **Step 1: Create `app/api/trips/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getTrips, createTrip } from '@/lib/wp-client'

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
  try {
    const data = await req.json()
    const trip = await createTrip(data)
    return NextResponse.json(trip, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/trips/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getTrip, updateTrip, deleteTrip } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const trip = await getTrip(params.id)
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const trip = await updateTrip(params.id, data)
    return NextResponse.json(trip)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteTrip(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/bookings/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getBookings } from '@/lib/wp-client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const bookings = await getBookings({ status: searchParams.get('status') ?? undefined })
    return NextResponse.json(bookings)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `app/api/bookings/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getBooking } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const booking = await getBooking(params.id)
    return NextResponse.json(booking)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
```

- [ ] **Step 5: Create `app/api/customers/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getCustomers } from '@/lib/wp-client'

export async function GET() {
  try {
    const customers = await getCustomers()
    return NextResponse.json(customers)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create `app/api/customers/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await getCustomer(params.id)
    return NextResponse.json(customer)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}
```

- [ ] **Step 7: Create `app/api/packages/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getPackages, createPackage } from '@/lib/wp-client'

export async function GET() {
  try {
    const packages = await getPackages()
    return NextResponse.json(packages)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const pkg = await createPackage(data)
    return NextResponse.json(pkg, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 8: Create `app/api/packages/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getPackage, updatePackage, deletePackage } from '@/lib/wp-client'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const pkg = await getPackage(params.id)
    return NextResponse.json(pkg)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const pkg = await updatePackage(params.id, data)
    return NextResponse.json(pkg)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deletePackage(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 9: Create `app/(dashboard)/page.tsx`**

```tsx
import { getTrips, getBookings, getCustomers, getPackages } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Globe, BookOpen, Users, Package, Plus } from 'lucide-react'

export default async function OverviewPage() {
  const [trips, bookings, customers, packages] = await Promise.all([
    getTrips(),
    getBookings(),
    getCustomers(),
    getPackages(),
  ])

  const recentBookings = bookings.slice(0, 5)

  const stats = [
    { label: 'Total Trips', value: trips.length, icon: Globe, trend: '+2 this month' },
    { label: 'Bookings', value: bookings.length, icon: BookOpen, trend: '+8 this month' },
    { label: 'Customers', value: customers.length, icon: Users, trend: '+5 this month' },
    { label: 'Packages', value: packages.length, icon: Package, trend: null },
  ]

  return (
    <div>
      <Topbar
        title="Overview"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        action={
          <Link href="/trips/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" />
              New Trip
            </Button>
          </Link>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, trend }) => (
          <div key={label} className="bg-[#111111] border border-[#1c1c1c] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
              <Icon size={14} className="text-zinc-600" />
            </div>
            <p className="text-3xl font-bold text-zinc-50 tracking-tight">{value}</p>
            {trend && <p className="text-[11px] text-green-500 mt-1.5">{trend}</p>}
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c1c1c]">
          <h2 className="text-sm font-semibold text-zinc-200">Recent Bookings</h2>
          <Link href="/bookings" className="text-xs text-sky-500 hover:text-sky-400 transition-colors">
            View all →
          </Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Customer', 'Trip', 'Date', 'Status', 'Amount'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentBookings.map(b => (
              <tr key={b.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                <td className="px-5 py-3.5 text-sm text-zinc-200">{b.customer_name}</td>
                <td className="px-5 py-3.5 text-sm text-zinc-500 max-w-[180px] truncate">{b.trip_title}</td>
                <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">
                  {new Date(b.booking_date).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">${b.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/trips/new">
          <Button variant="outline" size="sm" className="border-[#1c1c1c] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer transition-colors">
            <Plus size={14} className="mr-1.5" /> New Trip
          </Button>
        </Link>
        <Link href="/packages/new">
          <Button variant="outline" size="sm" className="border-[#1c1c1c] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer transition-colors">
            <Plus size={14} className="mr-1.5" /> New Package
          </Button>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Verify overview page**

Visit `http://localhost:3000/` after login — should show 4 stat cards and recent bookings table with mock data.

- [ ] **Step 11: Commit**

```bash
git add app/api/ app/(dashboard)/page.tsx
git commit -m "feat: all API routes and overview dashboard page"
```

---

## Task 11: Trips Module

**Files:** `components/trip-form.tsx`, `app/(dashboard)/trips/page.tsx`, `app/(dashboard)/trips/new/page.tsx`, `app/(dashboard)/trips/[id]/edit/page.tsx`

- [ ] **Step 1: Create `components/trip-form.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Trip, TripInput } from '@/lib/types'

const tripSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  destination: z.string().min(1, 'Destination is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  duration: z.coerce.number().int().positive('Duration must be a positive integer'),
  featured_image: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  status: z.enum(['draft', 'published']),
})

type TripFormValues = z.infer<typeof tripSchema>

interface TripFormProps {
  trip?: Trip
}

export function TripForm({ trip }: TripFormProps) {
  const router = useRouter()
  const isEditing = !!trip

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: trip?.title ?? '',
      description: trip?.description ?? '',
      destination: trip?.destination ?? '',
      price: trip?.price ?? undefined,
      duration: trip?.duration ?? undefined,
      featured_image: trip?.featured_image ?? '',
      status: trip?.status ?? 'draft',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: TripFormValues) => {
      const url = isEditing ? `/api/trips/${trip.id}` : '/api/trips'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save trip')
      return res.json()
    },
    onSuccess: () => {
      router.push('/trips')
      router.refresh()
    },
  })

  const fieldClass = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const labelClass = 'text-xs font-medium text-zinc-400'
  const errorClass = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={labelClass}>Title</Label>
        <Input {...register('title')} className={fieldClass} placeholder="e.g. Hunza Valley Explorer" />
        {errors.title && <p className={errorClass}>{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Description</Label>
        <Textarea {...register('description')} className={fieldClass} rows={4} placeholder="Describe the trip..." />
        {errors.description && <p className={errorClass}>{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Destination</Label>
          <Input {...register('destination')} className={fieldClass} placeholder="e.g. Hunza, Gilgit-Baltistan" />
          {errors.destination && <p className={errorClass}>{errors.destination.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Status</Label>
          <Select
            defaultValue={watch('status')}
            onValueChange={val => setValue('status', val as 'draft' | 'published')}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#1c1c1c]">
              <SelectItem value="draft" className="text-zinc-300 focus:bg-zinc-800">Draft</SelectItem>
              <SelectItem value="published" className="text-zinc-300 focus:bg-zinc-800">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Price (USD)</Label>
          <Input {...register('price')} type="number" min="0" step="0.01" className={fieldClass} placeholder="1200" />
          {errors.price && <p className={errorClass}>{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Duration (days)</Label>
          <Input {...register('duration')} type="number" min="1" className={fieldClass} placeholder="7" />
          {errors.duration && <p className={errorClass}>{errors.duration.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Featured Image URL <span className="text-zinc-600">(optional)</span></Label>
        <Input {...register('featured_image')} type="url" className={fieldClass} placeholder="https://..." />
        {errors.featured_image && <p className={errorClass}>{errors.featured_image.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save trip. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
        >
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Trip' : 'Create Trip'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/trips/page.tsx`**

```tsx
import Link from 'next/link'
import { getTrips } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { DeleteTripButton } from './delete-trip-button'
import { Plus, Pencil } from 'lucide-react'

interface Props {
  searchParams: { search?: string; status?: string }
}

export default async function TripsPage({ searchParams }: Props) {
  const trips = await getTrips({
    search: searchParams.search,
    status: searchParams.status,
  })

  return (
    <div>
      <Topbar
        title="Trips"
        subtitle={`${trips.length} trip${trips.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/trips/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Trip
            </Button>
          </Link>
        }
      />

      {/* Search + Filter */}
      <form className="flex gap-3 mb-5">
        <input
          name="search"
          defaultValue={searchParams.search}
          placeholder="Search trips…"
          className="bg-[#111111] border border-[#1c1c1c] rounded-md px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500 w-64 transition-colors"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ''}
          className="bg-[#111111] border border-[#1c1c1c] rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <Button type="submit" variant="outline" size="sm" className="border-[#1c1c1c] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer">
          Filter
        </Button>
        {(searchParams.search || searchParams.status) && (
          <Link href="/trips">
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
              Clear
            </Button>
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Title', 'Destination', 'Price', 'Duration', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No trips found.
                </td>
              </tr>
            ) : (
              trips.map(trip => (
                <tr key={trip.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-zinc-200">{trip.title}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{trip.destination}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">${trip.price.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{trip.duration}d</td>
                  <td className="px-5 py-3.5"><StatusBadge status={trip.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/trips/${trip.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <DeleteTripButton id={trip.id} title={trip.title} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/trips/delete-trip-button.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteTripButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete trip')
    },
    onSuccess: () => {
      setOpen(false)
      router.refresh()
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-red-950/40 cursor-pointer">
          <Trash2 size={13} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#111111] border-[#1c1c1c]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-50">Delete trip?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-500">
            <strong className="text-zinc-300">{title}</strong> will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[#1c1c1c] text-zinc-400 hover:bg-zinc-900 cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/trips/new/page.tsx`**

```tsx
import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'

export default function NewTripPage() {
  return (
    <div>
      <Topbar title="New Trip" subtitle="Create a new travel package" />
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg p-6">
        <TripForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/(dashboard)/trips/[id]/edit/page.tsx`**

```tsx
import { getTrip } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'
import { notFound } from 'next/navigation'

export default async function EditTripPage({ params }: { params: { id: string } }) {
  let trip
  try {
    trip = await getTrip(params.id)
  } catch {
    notFound()
  }

  return (
    <div>
      <Topbar title="Edit Trip" subtitle={trip.title} />
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg p-6">
        <TripForm trip={trip} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify trips module**

Visit `/trips` — table with 8 mock trips, search, filter. Click Edit → prefilled form. Create new trip → appears in list. Delete with confirmation dialog.

- [ ] **Step 7: Commit**

```bash
git add components/trip-form.tsx app/(dashboard)/trips/
git commit -m "feat: full trips CRUD module"
```

---

## Task 12: Bookings Module

**Files:** `app/(dashboard)/bookings/page.tsx`, `app/(dashboard)/bookings/[id]/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/bookings/page.tsx`**

```tsx
import Link from 'next/link'
import { getBookings } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'

interface Props {
  searchParams: { status?: string }
}

export default async function BookingsPage({ searchParams }: Props) {
  const bookings = await getBookings({ status: searchParams.status })

  return (
    <div>
      <Topbar
        title="Bookings"
        subtitle={`${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}
      />

      {/* Filter */}
      <form className="flex gap-3 mb-5">
        <select
          name="status"
          defaultValue={searchParams.status ?? ''}
          className="bg-[#111111] border border-[#1c1c1c] rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button type="submit" variant="outline" size="sm" className="border-[#1c1c1c] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer">
          Filter
        </Button>
        {searchParams.status && (
          <Link href="/bookings">
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 cursor-pointer">Clear</Button>
          </Link>
        )}
      </form>

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['ID', 'Customer', 'Trip', 'Date', 'Status', 'Amount'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-500">No bookings found.</td></tr>
            ) : (
              bookings.map(b => (
                <tr key={b.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5">
                    <Link href={`/bookings/${b.id}`} className="font-mono text-xs text-zinc-400 hover:text-sky-400 transition-colors">
                      {b.id}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-200">{b.customer_name}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500 max-w-[180px] truncate">{b.trip_title}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{new Date(b.booking_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">${b.amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/bookings/[id]/page.tsx`**

```tsx
import { getBooking } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { StatusBadge } from '@/components/status-badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  let booking
  try {
    booking = await getBooking(params.id)
  } catch {
    notFound()
  }

  const fields = [
    { label: 'Booking ID', value: booking.id, mono: true },
    { label: 'Customer', value: booking.customer_name },
    { label: 'Email', value: booking.customer_email },
    { label: 'Trip', value: booking.trip_title },
    { label: 'Booking Date', value: new Date(booking.booking_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
    { label: 'Amount', value: `$${booking.amount.toLocaleString()}` },
    { label: 'Notes', value: booking.notes ?? '—' },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link href="/bookings" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft size={12} /> Back to Bookings
        </Link>
        <Topbar
          title="Booking Detail"
          subtitle={`${booking.customer_name} · ${booking.trip_title}`}
          action={<StatusBadge status={booking.status} />}
        />
      </div>

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden max-w-2xl">
        {fields.map(({ label, value, mono }) => (
          <div key={label} className="flex items-start gap-4 px-5 py-4 border-b border-[#1c1c1c] last:border-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 w-32 flex-shrink-0 pt-0.5">
              {label}
            </span>
            <span className={`text-sm text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify bookings module**

Visit `/bookings` — table with status filter. Click a booking ID → detail page.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/bookings/
git commit -m "feat: bookings list and detail pages"
```

---

## Task 13: Customers Module

**Files:** `app/(dashboard)/customers/page.tsx`, `app/(dashboard)/customers/[id]/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/customers/page.tsx`**

```tsx
import Link from 'next/link'
import { getCustomers } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div>
      <Topbar title="Customers" subtitle={`${customers.length} customer${customers.length !== 1 ? 's' : ''}`} />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Name', 'Email', 'Phone', 'Linked Trip', 'Enquiry Date'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">No customers found.</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/customers/${c.id}`} className="text-sm font-medium text-zinc-200 hover:text-sky-400 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{c.email}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500 max-w-[180px] truncate">{c.trip_title ?? '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{new Date(c.enquiry_date).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/customers/[id]/page.tsx`**

```tsx
import { getCustomer } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  let customer
  try {
    customer = await getCustomer(params.id)
  } catch {
    notFound()
  }

  const fields = [
    { label: 'Name', value: customer.name },
    { label: 'Email', value: customer.email },
    { label: 'Phone', value: customer.phone ?? '—' },
    { label: 'Linked Trip', value: customer.trip_title ?? '—' },
    { label: 'Enquiry Date', value: new Date(customer.enquiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
  ]

  return (
    <div>
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
        <ArrowLeft size={12} /> Back to Customers
      </Link>
      <Topbar title="Customer Profile" subtitle={customer.email} />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden max-w-2xl">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-4 px-5 py-4 border-b border-[#1c1c1c] last:border-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 w-32 flex-shrink-0 pt-0.5">
              {label}
            </span>
            <span className="text-sm text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/customers/
git commit -m "feat: customers list and profile pages"
```

---

## Task 14: Packages Module

**Files:** `components/package-form.tsx`, `app/(dashboard)/packages/page.tsx`, `app/(dashboard)/packages/new/page.tsx`, `app/(dashboard)/packages/[id]/edit/page.tsx`

- [ ] **Step 1: Create `components/package-form.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Package, Trip } from '@/lib/types'

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  trip_id: z.string().min(1, 'Please select a trip'),
  inclusions: z.string().min(1, 'Inclusions are required'),
  max_people: z.coerce.number().int().positive('Must be a positive integer'),
})

type PackageFormValues = z.infer<typeof packageSchema>

interface PackageFormProps {
  pkg?: Package
  trips: Trip[]
}

export function PackageForm({ pkg, trips }: PackageFormProps) {
  const router = useRouter()
  const isEditing = !!pkg

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: pkg?.name ?? '',
      price: pkg?.price ?? undefined,
      trip_id: pkg?.trip_id ?? '',
      inclusions: pkg?.inclusions ?? '',
      max_people: pkg?.max_people ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: PackageFormValues) => {
      const url = isEditing ? `/api/packages/${pkg.id}` : '/api/packages'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save package')
      return res.json()
    },
    onSuccess: () => {
      router.push('/packages')
      router.refresh()
    },
  })

  const fieldClass = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const labelClass = 'text-xs font-medium text-zinc-400'
  const errorClass = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={labelClass}>Package Name</Label>
        <Input {...register('name')} className={fieldClass} placeholder="e.g. Hunza Standard" />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Price (USD)</Label>
          <Input {...register('price')} type="number" min="0" step="0.01" className={fieldClass} placeholder="1200" />
          {errors.price && <p className={errorClass}>{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Max People</Label>
          <Input {...register('max_people')} type="number" min="1" className={fieldClass} placeholder="10" />
          {errors.max_people && <p className={errorClass}>{errors.max_people.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Linked Trip</Label>
        <Select
          defaultValue={watch('trip_id')}
          onValueChange={val => setValue('trip_id', val)}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Select a trip…" />
          </SelectTrigger>
          <SelectContent className="bg-[#111111] border-[#1c1c1c]">
            {trips.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-zinc-300 focus:bg-zinc-800">
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.trip_id && <p className={errorClass}>{errors.trip_id.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Inclusions</Label>
        <Textarea {...register('inclusions')} className={fieldClass} rows={3} placeholder="Hotel, breakfast, transport, guide…" />
        {errors.inclusions && <p className={errorClass}>{errors.inclusions.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save package. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Package' : 'Create Package'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer">
          Cancel
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/packages/page.tsx`**

```tsx
import Link from 'next/link'
import { getPackages } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { DeletePackageButton } from './delete-package-button'
import { Plus, Pencil } from 'lucide-react'

export default async function PackagesPage() {
  const packages = await getPackages()

  return (
    <div>
      <Topbar
        title="Packages"
        subtitle={`${packages.length} package${packages.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/packages/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Package
            </Button>
          </Link>
        }
      />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Name', 'Linked Trip', 'Price', 'Max People', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">No packages found.</td></tr>
            ) : (
              packages.map(p => (
                <tr key={p.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-zinc-200">{p.name}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{p.trip_title}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">${p.price.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{p.max_people}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/packages/${p.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <DeletePackageButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/packages/delete-package-button.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeletePackageButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/packages/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete package')
    },
    onSuccess: () => { setOpen(false); router.refresh() },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-red-950/40 cursor-pointer">
          <Trash2 size={13} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#111111] border-[#1c1c1c]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-50">Delete package?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-500">
            <strong className="text-zinc-300">{name}</strong> will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[#1c1c1c] text-zinc-400 hover:bg-zinc-900 cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/packages/new/page.tsx`**

```tsx
import { getTrips } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { PackageForm } from '@/components/package-form'

export default async function NewPackagePage() {
  const trips = await getTrips()
  return (
    <div>
      <Topbar title="New Package" subtitle="Create a new pricing package" />
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg p-6">
        <PackageForm trips={trips} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/(dashboard)/packages/[id]/edit/page.tsx`**

```tsx
import { getPackage, getTrips } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { PackageForm } from '@/components/package-form'
import { notFound } from 'next/navigation'

export default async function EditPackagePage({ params }: { params: { id: string } }) {
  let pkg, trips
  try {
    ;[pkg, trips] = await Promise.all([getPackage(params.id), getTrips()])
  } catch {
    notFound()
  }

  return (
    <div>
      <Topbar title="Edit Package" subtitle={pkg.name} />
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg p-6">
        <PackageForm pkg={pkg} trips={trips} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify packages module**

Visit `/packages` — table with 5 packages. Create, edit, delete all work.

- [ ] **Step 7: Commit**

```bash
git add components/package-form.tsx app/(dashboard)/packages/
git commit -m "feat: full packages CRUD module"
```

---

## Task 15: 404 Page + Final Polish

**Files:** `app/not-found.tsx`

- [ ] **Step 1: Create `app/not-found.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">404</p>
        <h1 className="text-2xl font-bold text-zinc-50 tracking-tight mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/">
          <Button className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `.superpowers/` to `.gitignore`**

Open `.gitignore` and ensure it contains:
```
.superpowers/
```

- [ ] **Step 3: Final end-to-end verification**

With `npm run dev` running, verify each route:
1. `/login` — dark login form renders, wrong creds shows error, correct creds redirects
2. `/` — 4 stat cards, recent bookings table
3. `/trips` — list with search/filter, edit pencil, delete with dialog
4. `/trips/new` — form creates new trip, appears in list
5. `/trips/trip-1/edit` — form pre-populated with trip data
6. `/bookings` — list with status filter, click ID → detail
7. `/customers` — list, click name → profile
8. `/packages` — list, create/edit/delete work
9. Direct navigation to `/` without cookie → redirects to `/login`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete WHHolidays Admin dashboard

- Dark mode UI with Uber-grade design system
- JWT auth with httpOnly cookie + middleware protection
- RSC-first data fetching + TanStack Query mutations
- Mock/real WP API toggle via USE_MOCK_DATA env var
- Full CRUD for trips and packages
- Read-only views for bookings and customers
- Vercel-ready deployment"
```

---

## Self-Review

**Spec coverage:**
- ✅ All routes from spec present (trips, bookings, customers, packages)
- ✅ Auth flow: login → JWT cookie → middleware → logout
- ✅ WP integration with mock/real toggle
- ✅ Trip form: all 7 fields specified in spec
- ✅ Bookings read-only (no create/edit/delete)
- ✅ Customers read-only
- ✅ Packages CRUD with trip select
- ✅ Status badges (confirmed/pending/cancelled/published/draft)
- ✅ Search on trips via URL params
- ✅ Dashboard overview with counts + recent bookings
- ✅ Quick-action buttons on overview
- ✅ `.env.local.example` with all env vars
- ✅ Dark mode throughout, Inter font, Uber-grade design tokens
- ✅ Vercel-compatible (no platform-specific config needed beyond default Next.js)

**Type consistency:** `TripInput`, `PackageInput`, `Trip`, `Booking`, `Customer`, `Package` defined once in `lib/types.ts` and used consistently across `wp-client.ts`, API routes, and form components.

**No placeholders:** All steps contain exact code, exact commands, exact expected output.
