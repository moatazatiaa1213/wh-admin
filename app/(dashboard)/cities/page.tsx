import Link from 'next/link'
import { getCities } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { CitiesTable } from '@/components/cities-table'
import { Plus } from 'lucide-react'

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

      <CitiesTable cities={cities} />
    </div>
  )
}
