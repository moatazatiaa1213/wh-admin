'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DeleteEntityButton } from '@/components/delete-entity-button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, CheckCheck, X } from 'lucide-react'

export interface EntityColumn<T> {
  header: string
  render: (item: T) => ReactNode
}

interface EntityListTableProps<T extends { id: string }> {
  items: T[]
  columns: EntityColumn<T>[]
  apiBase: string                  // e.g. '/api/hotels' — DELETE `${apiBase}/${id}` per item
  editHrefBase: string             // e.g. '/hotels' — edit link is `${editHrefBase}/${id}/edit`
  getLabel: (item: T) => string    // display name used in delete confirmations
  entityNamePlural: string         // lowercase, e.g. 'hotels' — used in bulk-delete copy
  emptyMessage: string
}

// Generic list table for the simple library entities (hotels, excursions,
// airlines, cities): a checkbox column, a floating bulk-delete bar once
// anything is selected, and the existing per-row DeleteEntityButton for
// single deletes. Column contents are fully caller-defined so each entity
// keeps its own fields.
export function EntityListTable<T extends { id: string }>({
  items, columns, apiBase, editHrefBase, getLabel, entityNamePlural, emptyMessage,
}: EntityListTableProps<T>) {
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router                      = useRouter()
  const selectAllRef                = useRef<HTMLInputElement>(null)

  const allSelected  = items.length > 0 && selected.size === items.length
  const someSelected = selected.size > 0 && !allSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map(i => i.id)))
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function bulkDelete() {
    startTransition(async () => {
      await Promise.allSettled(
        Array.from(selected).map(id => fetch(`${apiBase}/${id}`, { method: 'DELETE' }))
      )
      setSelected(new Set())
      router.refresh()
    })
  }

  const n = selected.size

  return (
    <div>
      {n > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-2 px-4 py-2.5
          bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60
          animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5 pr-3 border-r border-zinc-700">
            <CheckCheck size={14} className="text-sky-400" />
            {n} selected
          </span>
          <button
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5
              bg-red-950/60 border border-red-800/60 text-red-400
              hover:bg-red-900/60 disabled:opacity-40 transition-colors cursor-pointer"
          ><Trash2 size={11} /> Delete</button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 p-1 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          ><X size={13} /></button>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#111111] border-[#1c1c1c]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-50">Delete {n} {entityNamePlural}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This will permanently delete <strong className="text-zinc-300">{n} {entityNamePlural}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#1c1c1c] text-zinc-400 hover:bg-zinc-900 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => { setDeleteOpen(false); bulkDelete() }}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {isPending ? 'Deleting…' : `Delete ${n} ${entityNamePlural}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              <th className="px-5 py-3 w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-sky-500 cursor-pointer"
                />
              </th>
              {columns.map(col => (
                <th key={col.header} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {col.header}
                </th>
              ))}
              <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-5 py-12 text-center text-sm text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr
                  key={item.id}
                  className={`border-b border-[#1c1c1c] last:border-0 transition-colors
                    ${selected.has(item.id) ? 'bg-sky-950/20' : 'hover:bg-zinc-900/40'}`}
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-sky-500 cursor-pointer"
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.header} className="px-5 py-3.5">{col.render(item)}</td>
                  ))}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`${editHrefBase}/${item.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <DeleteEntityButton apiUrl={`${apiBase}/${item.id}`} label={getLabel(item)} />
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
