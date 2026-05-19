import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'
import { getCities, getHotels, getAirlines, getExcursions } from '@/lib/wp-client'

export default async function NewTripPage() {
  const [cities, hotels, airlines, excursions] = await Promise.all([
    getCities(),
    getHotels(),
    getAirlines(),
    getExcursions(),
  ])

  return (
    <>
      <Topbar title="New Trip" subtitle="Create a new travel package" />
      <div className="mt-8">
        <TripForm cities={cities} hotels={hotels} airlines={airlines} excursions={excursions} />
      </div>
    </>
  )
}
