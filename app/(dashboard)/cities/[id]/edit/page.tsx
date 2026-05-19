import { notFound } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { CityForm } from '@/components/city-form'
import { getCity } from '@/lib/wp-client'

interface EditCityPageProps {
  params: { id: string }
}

export default async function EditCityPage({ params }: EditCityPageProps) {
  let city
  try {
    city = await getCity(params.id)
  } catch {
    notFound()
  }

  return (
    <>
      <Topbar title="Edit City" subtitle={city.name} />
      <div className="mt-8">
        <CityForm city={city} />
      </div>
    </>
  )
}
