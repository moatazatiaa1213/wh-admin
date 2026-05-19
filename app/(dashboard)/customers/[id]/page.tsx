import { getCustomer } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  let customer
  try {
    customer = await getCustomer(params.id)
  } catch {
    notFound()
  }

  const fields = [
    { label: 'Name', value: customer.name },
    { label: 'Email', value: customer.email },
    { label: 'Phone', value: customer.phone ?? '—' },
    { label: 'Linked Trip', value: customer.trip_title ?? '—' },
    { label: 'Enquiry Date', value: new Date(customer.enquiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
  ]

  return (
    <div>
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
        <ArrowLeft size={12} /> Back to Customers
      </Link>
      <Topbar title="Customer Profile" subtitle={customer.email} />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden max-w-2xl mt-6">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-4 px-5 py-4 border-b border-[#1c1c1c] last:border-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 w-32 flex-shrink-0 pt-0.5">
              {label}
            </span>
            <span className="text-sm text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
