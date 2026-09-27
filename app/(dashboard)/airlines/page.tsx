import Link from 'next/link'
import { getAirlines } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import { formatBaggage } from '@/lib/format-baggage'
import { Plus } from 'lucide-react'
import type { Airline } from '@/lib/types'

const columns: EntityColumn<Airline>[] = [
  {
    header: 'Name',
    render: airline => <p className="text-sm font-medium text-zinc-200">{airline.name}</p>,
  },
  {
    header: 'Baggage Allowance',
    render: airline => <span className="text-sm text-zinc-500">{formatBaggage(airline) || '—'}</span>,
  },
  {
    header: 'Type',
    render: airline =>
      airline.type ? (
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
          airline.type === 'international'
            ? 'bg-sky-950/60 text-sky-400 border border-sky-800/60'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        }`}>
          {airline.type}
        </span>
      ) : (
        <span className="text-xs text-zinc-600">—</span>
      ),
  },
]

export default async function AirlinesPage() {
  const airlines = await getAirlines()

  return (
    <div>
      <Topbar
        title="Airlines"
        subtitle={`${airlines.length} airline${airlines.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/airlines/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Airline
            </Button>
          </Link>
        }
      />

      <EntityListTable
        items={airlines}
        columns={columns}
        apiBase="/api/airlines"
        editHrefBase="/airlines"
        getLabel={airline => airline.name}
        entityNamePlural="airlines"
        emptyMessage="No airlines found. Add one to get started."
      />
    </div>
  )
}
