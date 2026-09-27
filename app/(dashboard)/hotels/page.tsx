import Link from 'next/link'
import { getHotels } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { HotelsTable } from '@/components/hotels-table'
import { Plus } from 'lucide-react'

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

      <HotelsTable hotels={hotels} />
    </div>
  )
}
