'use client'

import { Star } from 'lucide-react'
import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import type { Hotel } from '@/lib/types'

// Columns must be defined in a Client Component: they hold render functions,
// and functions can't be passed as props from a Server Component (the
// page.tsx that fetches `hotels`) into a Client Component like
// EntityListTable — Next.js can't serialize them across that boundary. This
// thin wrapper receives only plain hotel data from the server and builds the
// columns entirely on the client side.
const columns: EntityColumn<Hotel>[] = [
  {
    header: 'Name',
    render: hotel => <p className="text-sm font-medium text-zinc-200">{hotel.name}</p>,
  },
  {
    header: 'Stars',
    render: hotel => (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: hotel.stars }).map((_, i) => (
          <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
    ),
  },
  {
    header: 'Location',
    render: hotel => <span className="text-sm text-zinc-500">{hotel.location}</span>,
  },
  {
    header: 'Website',
    render: hotel =>
      hotel.website ? (
        <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:text-sky-400 transition-colors truncate max-w-[160px] block">
          {hotel.website.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <span className="text-xs text-zinc-600">—</span>
      ),
  },
]

export function HotelsTable({ hotels }: { hotels: Hotel[] }) {
  return (
    <EntityListTable
      items={hotels}
      columns={columns}
      apiBase="/api/hotels"
      editHrefBase="/hotels"
      getLabel={hotel => hotel.name}
      entityNamePlural="hotels"
      emptyMessage="No hotels found. Add one to get started."
    />
  )
}
