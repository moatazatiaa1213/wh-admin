import { Topbar } from '@/components/topbar'
import { ExcursionForm } from '@/components/excursion-form'

export default function NewExcursionPage() {
  return (
    <>
      <Topbar title="New Excursion" subtitle="Add an excursion to the library" />
      <div className="mt-8">
        <ExcursionForm />
      </div>
    </>
  )
}
