import { notFound } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { HotelForm } from '@/components/hotel-form'
import { getHotel } from '@/lib/wp-client'

interface EditHotelPageProps {
  params: { id: string }
}

export default async function EditHotelPage({ params }: EditHotelPageProps) {
  let hotel
  try {
    hotel = await getHotel(params.id)
  } catch {
    notFound()
  }

  return (
    <>
      <Topbar title="Edit Hotel" subtitle={hotel.name} />
      <div className="mt-8">
        <HotelForm hotel={hotel} />
      </div>
    </>
  )
}
