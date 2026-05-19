import { notFound } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { AirlineForm } from '@/components/airline-form'
import { getAirline } from '@/lib/wp-client'

interface EditAirlinePageProps {
  params: { id: string }
}

export default async function EditAirlinePage({ params }: EditAirlinePageProps) {
  let airline
  try {
    airline = await getAirline(params.id)
  } catch {
    notFound()
  }

  return (
    <>
      <Topbar title="Edit Airline" subtitle={airline.name} />
      <div className="mt-8">
        <AirlineForm airline={airline} />
      </div>
    </>
  )
}
