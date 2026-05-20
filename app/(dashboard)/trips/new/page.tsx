import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'
import { getCities, getHotels, getAirlines, getExcursions, getNextTripNumber } from '@/lib/wp-client'

export default async function NewTripPage() {
  const [cities, hotels, airlines, excursions, nextTripNumber] = await Promise.all([
    getCities(),
    getHotels(),
    getAirlines(),
    getExcursions(),
    getNextTripNumber(),
  ])

  return (
    <>
      <Topbar title="New Trip" subtitle="Create a new travel package" />
      <div className="mt-8">
        <TripForm
          cities={cities}
          hotels={hotels}
          airlines={airlines}
          excursions={excursions}
          nextTripNumber={nextTripNumber}
        />
      </div>
    </>
  )
}
