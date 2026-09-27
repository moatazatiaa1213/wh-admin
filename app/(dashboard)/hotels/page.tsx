import Link from 'next/link'
import { getHotels } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import { Plus, Star } from 'lucide-react'
import type { Hotel } from '@/lib/types'

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

export default async function HotelsPage() {
  const hotels = await getHotels()

  return (
    <div>
      <Topbar
        title="Hotels"
        subtitle={`${hotels.length} hotel${hotels.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/hotels/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Hotel
            </Button>
          </Link>
        }
      />

      <EntityListTable
        items={hotels}
        columns={columns}
        apiBase="/api/hotels"
        editHrefBase="/hotels"
        getLabel={hotel => hotel.name}
        entityNamePlural="hotels"
        emptyMessage="No hotels found. Add one to get started."
      />
    </div>
  )
}
