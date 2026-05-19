import { Topbar } from '@/components/topbar'
import { HotelForm } from '@/components/hotel-form'

export default function NewHotelPage() {
  return (
    <>
      <Topbar title="New Hotel" subtitle="Add a hotel to the library" />
      <div className="mt-8">
        <HotelForm />
      </div>
    </>
  )
}
