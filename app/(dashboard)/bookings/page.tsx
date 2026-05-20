import Link from 'next/link'
import { getBookings } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

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
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{formatDate(b.booking_date)}</td>
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
