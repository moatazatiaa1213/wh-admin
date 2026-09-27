'use client'

import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import type { City } from '@/lib/types'

// See hotels-table.tsx for why this wrapper (and its column definitions)
// must live in a Client Component rather than in the server page.tsx.
const columns: EntityColumn<City>[] = [
  {
    header: 'Name',
    render: city => <p className="text-sm font-medium text-zinc-200">{city.name}</p>,
  },
  {
    header: 'Country',
    render: city => <span className="text-sm text-zinc-500">{city.country}</span>,
  },
  {
    header: 'Location',
    render: city => <span className="text-sm text-zinc-500">{city.location}</span>,
  },
]

export function CitiesTable({ cities }: { cities: City[] }) {
  return (
    <EntityListTable
      items={cities}
      columns={columns}
      apiBase="/api/cities"
      editHrefBase="/cities"
      getLabel={city => city.name}
      entityNamePlural="cities"
      emptyMessage="No cities found. Add one to get started."
    />
  )
}
