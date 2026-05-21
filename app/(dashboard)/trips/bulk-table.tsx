'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trip } from '@/lib/types'
import { StatusToggle } from './status-toggle'
import { AvailabilityToggle } from './availability-toggle'
import { DeleteTripButton } from './delete-trip-button'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, CheckCheck, X, FileDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props { trips: Trip[] }

type BulkAction = 'publish' | 'draft' | 'available' | 'completed' | 'delete'

export function BulkTable({ trips }: Props) {
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [isPending, startTransition]    = useTransition()
  const router                          = useRouter()
  const selectAllRef                    = useRef<HTMLInputElement>(null)

  const allSelected  = trips.length > 0 && selected.size === trips.length
  const someSelected = selected.size > 0 && !allSelected

  // Indeterminate state can only be set via DOM ref, not JSX prop
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(trips.map(t => t.id)))
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulkAction(action: BulkAction) {
    if (selected.size === 0) return
    startTransition(async () => {
      await fetch('/api/trips/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      })
      setSelected(new Set())
      router.refresh()
    })
  }

  const n = selected.size

  return (
    <div>
      {/* ── Floating bulk-action bar ─────────────────────────────────── */}
      {n > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-2 px-4 py-2.5
          bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60
          animate-in slide-in-from-bottom-4 duration-200">

          {/* Count */}
          <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5 pr-3 border-r border-zinc-700">
            <CheckCheck size={14} className="text-sky-400" />
            {n} selected
          </span>

          {/* Status */}
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</span>
          <button
            disabled={isPending}
            onClick={() => runBulkAction('publish')}
            className="text-xs font-semibold px-2.5 py-1 rounded-full
              bg-sky-950/60 border border-sky-800/60 text-sky-400
              hover:bg-sky-900/60 disabled:opacity-40 transition-colors cursor-pointer"
          >Published</button>
          <button
            disabled={isPending}
            onClick={() => runBulkAction('draft')}
            className="text-xs font-semibold px-2.5 py-1 rounded-full
              bg-amber-950/60 border border-amber-800/60 text-amber-400
              hover:bg-amber-900/60 disabled:opacity-40 transition-colors cursor-pointer"
          >Draft</button>

          <div className="w-px h-5 bg-zinc-700 mx-1" />

          {/* Availability */}
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Availability</span>
          <button
            disabled={isPending}
            onClick={() => runBulkAction('available')}
            className="text-xs font-semibold px-2.5 py-1 rounded-full
              bg-emerald-950/60 border border-emerald-800/60 text-emerald-400
              hover:bg-emerald-900/60 disabled:opacity-40 transition-colors cursor-pointer"
          >Available</button>
          <button
            disabled={isPending}
            onClick={() => runBulkAction('completed')}
            className="text-xs font-semibold px-2.5 py-1 rounded-full
              bg-zinc-800 border border-zinc-700 text-zinc-400
              hover:bg-zinc-700 disabled:opacity-40 transition-colors cursor-pointer"
          >Completed</button>

          <div className="w-px h-5 bg-zinc-700 mx-1" />

          {/* Delete */}
          <button
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5
              bg-red-950/60 border border-red-800/60 text-red-400
              hover:bg-red-900/60 disabled:opacity-40 transition-colors cursor-pointer"
          ><Trash2 size={11} /> Delete</button>

          {/* Dismiss */}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 p-1 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          ><X size={13} /></button>
        </div>
      )}

      {/* ── Bulk delete confirmation ──────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#111111] border-[#1c1c1c]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-50">Delete {n} trip{n !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This will permanently delete <strong className="text-zinc-300">{n} trip{n !== 1 ? 's' : ''}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#1c1c1c] text-zinc-400 hover:bg-zinc-900 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => { setDeleteOpen(false); runBulkAction('delete') }}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {isPending ? 'Deleting…' : `Delete ${n} trip${n !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {/* Select-all */}
              <th className="px-5 py-3 w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-sky-500 cursor-pointer"
                />
              </th>
              {['Title', 'Destination', 'Dates', 'Adult Price', 'Duration', 'Status', 'Availability', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No trips found.
                </td>
              </tr>
            ) : trips.map(trip => (
              <tr
                key={trip.id}
                className={`border-b border-[#1c1c1c] last:border-0 transition-colors
                  ${selected.has(trip.id) ? 'bg-sky-950/20' : 'hover:bg-zinc-900/40'}`}
              >
                <td className="px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(trip.id)}
                    onChange={() => toggleOne(trip.id)}
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-sky-500 cursor-pointer"
                  />
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-zinc-200">{trip.title}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-zinc-500">{trip.destination}</td>
                <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">
                  {formatDate(trip.travel_date)}
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-zinc-200">
                  {trip.price_adult ? `$${Number(trip.price_adult).toLocaleString()}` : '—'}
                </td>
                <td className="px-5 py-3.5 text-sm text-zinc-500">
                  {trip.duration_days}D / {trip.duration_nights}N
                </td>
                <td className="px-5 py-3.5">
                  <StatusToggle tripId={trip.id} current={trip.status as 'published' | 'draft'} />
                </td>
                <td className="px-5 py-3.5">
                  <AvailabilityToggle tripId={trip.id} current={trip.availability ?? 'available'} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/trips/${trip.id}/edit`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                        <Pencil size={13} />
                      </Button>
                    </Link>
                    <a href={`/api/trips/${trip.id}/pdf`} download target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" title="Download Brochure PDF" className="h-7 px-2 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 cursor-pointer">
                        <FileDown size={13} />
                      </Button>
                    </a>
                    <DeleteTripButton id={trip.id} title={trip.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
