import { getBooking } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { StatusBadge } from '@/components/status-badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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
    { label: 'Booking Date', value: formatDate(booking.booking_date, { year: 'numeric', month: 'long', day: 'numeric' }) },
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
