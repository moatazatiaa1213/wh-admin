import { Topbar } from '@/components/topbar'
import { CityForm } from '@/components/city-form'

export default function NewCityPage() {
  return (
    <>
      <Topbar title="New City" subtitle="Add a city to the library" />
      <div className="mt-8">
        <CityForm />
      </div>
    </>
  )
}
