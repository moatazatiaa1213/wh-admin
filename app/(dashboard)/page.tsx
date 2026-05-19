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
