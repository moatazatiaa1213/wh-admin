import { Topbar } from '@/components/topbar'
import { AirlineForm } from '@/components/airline-form'

export default function NewAirlinePage() {
  return (
    <>
      <Topbar title="New Airline" subtitle="Add an airline to the library" />
      <div className="mt-8">
        <AirlineForm />
      </div>
    </>
  )
}
