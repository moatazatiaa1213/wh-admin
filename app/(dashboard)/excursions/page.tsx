import Link from 'next/link'
import { getExcursions } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { EntityListTable, type EntityColumn } from '@/components/entity-list-table'
import { Plus } from 'lucide-react'
import type { Excursion } from '@/lib/types'

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

export default async function ExcursionsPage() {
  const excursions = await getExcursions()

  return (
    <div>
      <Topbar
        title="Excursions"
        subtitle={`${excursions.length} excursion${excursions.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/excursions/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Excursion
            </Button>
          </Link>
        }
      />

      <EntityListTable
        items={excursions}
        columns={columns}
        apiBase="/api/excursions"
        editHrefBase="/excursions"
        getLabel={excursion => excursion.name}
        entityNamePlural="excursions"
        emptyMessage="No excursions found. Add one to get started."
      />
    </div>
  )
}
