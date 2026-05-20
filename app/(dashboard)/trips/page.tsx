import Link from 'next/link'
import { getTrips } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { DeleteTripButton } from './delete-trip-button'
import { AvailabilityToggle } from './availability-toggle'
import { StatusToggle } from './status-toggle'
import { Plus, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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
              {['Title', 'Destination', 'Dates', 'Adult Price', 'Duration', 'Status', 'Availability', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
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
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">
                    {formatDate(trip.travel_date)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">{trip.price_adult ? `$${Number(trip.price_adult).toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{trip.duration_days}D / {trip.duration_nights}N</td>
                  <td className="px-5 py-3.5">
                    <StatusToggle
                      tripId={trip.id}
                      current={trip.status as 'published' | 'draft'}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <AvailabilityToggle
                      tripId={trip.id}
                      current={trip.availability ?? 'available'}
                    />
                  </td>
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
