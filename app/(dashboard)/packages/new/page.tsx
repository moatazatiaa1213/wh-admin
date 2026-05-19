import { getTrips } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { PackageForm } from '@/components/package-form'

export default async function NewPackagePage() {
  const trips = await getTrips()
  return (
    <div>
      <Topbar title="New Package" subtitle="Create a new pricing package" />
      <div className="mt-8">
        <PackageForm trips={trips} />
      </div>
    </div>
  )
}
