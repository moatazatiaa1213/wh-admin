'use client'

import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import { formatBaggage } from '@/lib/format-baggage'
import type { Airline } from '@/lib/types'

// See hotels-table.tsx for why this wrapper (and its column definitions)
// must live in a Client Component rather than in the server page.tsx.
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

export function AirlinesTable({ airlines }: { airlines: Airline[] }) {
  return (
    <EntityListTable
      items={airlines}
      columns={columns}
      apiBase="/api/airlines"
      editHrefBase="/airlines"
      getLabel={airline => airline.name}
      entityNamePlural="airlines"
      emptyMessage="No airlines found. Add one to get started."
    />
  )
}
