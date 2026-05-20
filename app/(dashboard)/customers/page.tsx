import Link from 'next/link'
import { getCustomers } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { formatDate } from '@/lib/utils'

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div>
      <Topbar title="Customers" subtitle={`${customers.length} customer${customers.length !== 1 ? 's' : ''}`} />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Name', 'Email', 'Phone', 'Linked Trip', 'Enquiry Date'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">No customers found.</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/customers/${c.id}`} className="text-sm font-medium text-zinc-200 hover:text-sky-400 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{c.email}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500 max-w-[180px] truncate">{c.trip_title ?? '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">{formatDate(c.enquiry_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
