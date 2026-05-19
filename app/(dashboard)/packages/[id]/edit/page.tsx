import { getPackage, getTrips } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { PackageForm } from '@/components/package-form'
import { notFound } from 'next/navigation'

export default async function EditPackagePage({ params }: { params: { id: string } }) {
  let pkg, trips
  try {
    ;[pkg, trips] = await Promise.all([getPackage(params.id), getTrips()])
  } catch {
    notFound()
  }

  return (
    <div>
      <Topbar title="Edit Package" subtitle={pkg.name} />
      <div className="mt-8">
        <PackageForm pkg={pkg} trips={trips} />
      </div>
    </div>
  )
}
