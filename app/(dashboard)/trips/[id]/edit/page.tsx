import { notFound } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'
import { getTrip, getCities, getHotels, getAirlines, getExcursions } from '@/lib/wp-client'

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

  const [cities, hotels, airlines, excursions] = await Promise.all([
    getCities(),
    getHotels(),
    getAirlines(),
    getExcursions(),
  ])

  return (
    <>
      <Topbar title="Edit Trip" subtitle={trip.title} />
      <div className="mt-8">
        <TripForm trip={trip} cities={cities} hotels={hotels} airlines={airlines} excursions={excursions} />
      </div>
    </>
  )
}
