'use client'

import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import type { Excursion } from '@/lib/types'

// See hotels-table.tsx for why this wrapper (and its column definitions)
// must live in a Client Component rather than in the server page.tsx.
const columns: EntityColumn<Excursion>[] = [
  {
    header: 'Name',
    render: excursion => <p className="text-sm font-medium text-zinc-200">{excursion.name}</p>,
  },
  {
    header: 'Description',
    render: excursion => <p className="text-sm text-zinc-500 max-w-[420px] truncate">{excursion.description}</p>,
  },
  {
    header: 'Default',
    render: excursion =>
      excursion.inclusion === 'excluded' ? (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-red-400">
          {excursion.price ? `Excluded — +addon EGP ${excursion.price.toLocaleString()}` : 'Excluded'}
        </span>
      ) : excursion.inclusion === 'included' ? (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
          Included
        </span>
      ) : (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/60 text-zinc-400">
          Empty
        </span>
      ),
  },
]

export function ExcursionsTable({ excursions }: { excursions: Excursion[] }) {
  return (
    <EntityListTable
      items={excursions}
      columns={columns}
      apiBase="/api/excursions"
      editHrefBase="/excursions"
      getLabel={excursion => excursion.name}
      entityNamePlural="excursions"
      emptyMessage="No excursions found. Add one to get started."
    />
  )
}
