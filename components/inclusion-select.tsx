'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { InclusionStatus } from '@/lib/types'

interface InclusionSelectProps {
  status: InclusionStatus
  price?: number
  onStatusChange: (status: InclusionStatus) => void
  onPriceChange: (price: number | undefined) => void
  className?: string
}

// Shared Excluded / Included picker. Excluded reveals an optional add-on
// price (e.g. "book this separately for EGP 500") — left blank, it's just
// excluded with nothing to add on. Used for the Excursion library default,
// per-trip excursion overrides, and per-day itinerary inclusion.
export function InclusionSelect({ status, price, onStatusChange, onPriceChange, className }: InclusionSelectProps) {
  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const showPrice = status === 'excluded'

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Select value={status} onValueChange={val => onStatusChange(val as InclusionStatus)}>
        <SelectTrigger className={`${f} h-8 w-[140px] shrink-0`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#111111] border-[#1c1c1c]">
          <SelectItem value="excluded" className="text-zinc-300 focus:bg-zinc-800">Excluded</SelectItem>
          <SelectItem value="included" className="text-zinc-300 focus:bg-zinc-800">Included</SelectItem>
        </SelectContent>
      </Select>
      {showPrice && (
        <Input
          type="number"
          min={0}
          value={price ?? ''}
          onChange={e => onPriceChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className={`${f} h-8 w-[130px]`}
          placeholder="Add-on EGP"
        />
      )}
    </div>
  )
}
