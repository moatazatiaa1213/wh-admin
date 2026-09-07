import Link from 'next/link'
import { getTrips } from '@/lib/wp-client'
import { sortTripsByNumber } from '@/lib/sort-trips'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { BulkTable } from './bulk-table'
import { TripImportDialog } from '@/components/trip-import-dialog'
import { Plus } from 'lucide-react'

interface Props {
  searchParams: { search?: string; status?: string }
}

export default async function TripsPage({ searchParams }: Props) {
  const trips = sortTripsByNumber(await getTrips({
    search: searchParams.search,
    status: searchParams.status,
  }))

  return (
    <div>
      <Topbar
        title="Trips"
        subtitle={`${trips.length} trip${trips.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <TripImportDialog />
            <Link href="/trips/new">
              <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
                <Plus size={14} className="mr-1.5" /> New Trip
              </Button>
            </Link>
          </div>
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

      {/* Table with bulk selection */}
      <BulkTable trips={trips} />
    </div>
  )
}
