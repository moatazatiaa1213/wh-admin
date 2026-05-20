import { getTrips, getCities, getHotels, getAirlines, getExcursions } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { MigrationTable } from './migration-table'

export default async function MigrationPage() {
  const [trips, cities, hotels, airlines, excursions] = await Promise.all([
    getTrips({}),
    getCities(),
    getHotels(),
    getAirlines(),
    getExcursions(),
  ])

  // Only show trips that still need migration (missing library links OR prices OR dates)
  const unlinked = trips.filter(t =>
    t.hotel_ids.length === 0 ||
    t.airline_ids.length === 0 ||
    t.city_ids.length === 0 ||
    !t.price_adult ||
    !t.travel_date
  )

  return (
    <div>
      <Topbar
        title="Trip Migration"
        subtitle={`${unlinked.length} trips need data — link library items, set prices & dates`}
      />
      <div className="mt-6">
        <MigrationTable
          trips={unlinked}
          cities={cities}
          hotels={hotels}
          airlines={airlines}
          excursions={excursions}
        />
      </div>
    </div>
  )
}
