import Link from 'next/link'
import { getHotels } from '@/lib/wp-client'
import { Topbar } from '@/components/topbar'
import { Button } from '@/components/ui/button'
import { DeleteEntityButton } from '@/components/delete-entity-button'
import { Plus, Pencil, Star } from 'lucide-react'

export default async function HotelsPage() {
  const hotels = await getHotels()

  return (
    <div>
      <Topbar
        title="Hotels"
        subtitle={`${hotels.length} hotel${hotels.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/hotels/new">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
              <Plus size={14} className="mr-1.5" /> New Hotel
            </Button>
          </Link>
        }
      />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Name', 'Stars', 'Location', 'Website', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hotels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No hotels found. Add one to get started.
                </td>
              </tr>
            ) : (
              hotels.map(hotel => (
                <tr key={hotel.id} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-zinc-200">{hotel.name}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{hotel.location}</td>
                  <td className="px-5 py-3.5">
                    {hotel.website ? (
                      <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:text-sky-400 transition-colors truncate max-w-[160px] block">
                        {hotel.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/hotels/${hotel.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <DeleteEntityButton apiUrl={`/api/hotels/${hotel.id}`} label={hotel.name} />
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
