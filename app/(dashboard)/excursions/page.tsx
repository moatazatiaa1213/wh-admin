import Link from 'next/link'
import { getExcursions } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { DeleteEntityButton } from '@/components/delete-entity-button'
import { Plus, Pencil } from 'lucide-react'

export default async function ExcursionsPage() {
  const excursions = await getExcursions()

  return (
    <div>
      <Topbar
        title="Excursions"
        subtitle={`${excursions.length} excursion${excursions.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/excursions/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Excursion
            </Button>
          </Link>
        }
      />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Name', 'Description', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {excursions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No excursions found. Add one to get started.
                </td>
              </tr>
            ) : (
              excursions.map(excursion => (
                <tr key={excursion.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5 min-w-[180px]">
                    <p className="text-sm font-medium text-zinc-200">{excursion.name}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500 max-w-[420px]">
                    <p className="truncate">{excursion.description}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/excursions/${excursion.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <DeleteEntityButton apiUrl={`/api/excursions/${excursion.id}`} label={excursion.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
