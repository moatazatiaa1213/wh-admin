import Link from 'next/link'
import { getCities } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import { Plus } from 'lucide-react'
import type { City } from '@/lib/types'

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

export default async function CitiesPage() {
  const cities = await getCities()

  return (
    <div>
      <Topbar
        title="Cities"
        subtitle={`${cities.length} city${cities.length !== 1 ? 'ies' : 'y'}`}
        action={
          <Link href="/cities/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New City
            </Button>
          </Link>
        }
      />

      <EntityListTable
        items={cities}
        columns={columns}
        apiBase="/api/cities"
        editHrefBase="/cities"
        getLabel={city => city.name}
        entityNamePlural="cities"
        emptyMessage="No cities found. Add one to get started."
      />
    </div>
  )
}
