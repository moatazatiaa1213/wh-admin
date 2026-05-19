import { Topbar } from '@/components/topbar'
import { TripForm } from '@/components/trip-form'

export default function NewTripPage() {
  return (
    <>
      <Topbar title="New Trip" subtitle="Create a new travel package" />
      <div className="mt-8">
        <TripForm />
      </div>
    </>
  )
}
