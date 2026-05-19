import Link from 'next/link'
import { getPackages } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { DeletePackageButton } from './delete-package-button'
import { Plus, Pencil } from 'lucide-react'

export default async function PackagesPage() {
  const packages = await getPackages()

  return (
    <div>
      <Topbar
        title="Packages"
        subtitle={`${packages.length} package${packages.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/packages/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Package
            </Button>
          </Link>
        }
      />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Name', 'Linked Trip', 'Price', 'Max People', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">No packages found.</td></tr>
            ) : (
              packages.map(p => (
                <tr key={p.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-zinc-200">{p.name}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{p.trip_title}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">${p.price.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{p.max_people}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/packages/${p.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <DeletePackageButton id={p.id} name={p.name} />
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
