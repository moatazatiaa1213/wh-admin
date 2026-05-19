import { notFound } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { ExcursionForm } from '@/components/excursion-form'
import { getExcursion } from '@/lib/wp-client'

interface EditExcursionPageProps {
  params: { id: string }
}

export default async function EditExcursionPage({ params }: EditExcursionPageProps) {
  let excursion
  try {
    excursion = await getExcursion(params.id)
  } catch {
    notFound()
  }

  return (
    <>
      <Topbar title="Edit Excursion" subtitle={excursion.name} />
      <div className="mt-8">
        <ExcursionForm excursion={excursion} />
      </div>
    </>
  )
}
