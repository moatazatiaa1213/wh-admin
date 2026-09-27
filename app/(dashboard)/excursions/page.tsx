import Link from 'next/link'
import { getExcursions } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { ExcursionsTable } from '@/components/excursions-table'
import { Plus } from 'lucide-react'

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

      <ExcursionsTable excursions={excursions} />
    </div>
  )
}
