import Link from 'next/link'
import { getAirlines } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { AirlinesTable } from '@/components/airlines-table'
import { Plus } from 'lucide-react'

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

      <AirlinesTable airlines={airlines} />
    </div>
  )
}
