import { notFound } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'
import { getTrip } from '@/lib/wp-client'

interface EditTripPageProps {
  params: { id: string }
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  let trip
  try {
    trip = await getTrip(params.id)
  } catch {
    notFound()
  }

  return (
    <>
      <Topbar title="Edit Trip" subtitle={trip.title} />
      <div className="mt-8">
        <TripForm trip={trip} />
      </div>
    </>
  )
}
