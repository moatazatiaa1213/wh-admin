'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string        // ISO date string yyyy-MM-dd
  onChange: (iso: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected = value ? new Date(value + 'T00:00:00') : undefined

  function handleSelect(day: Date | undefined) {
    if (!day) return
    // Format to yyyy-MM-dd
    const iso = format(day, 'yyyy-MM-dd')
    onChange(iso)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-[#1c1c1c]',
            'bg-[#09090b] px-3 py-2 text-sm text-left',
            'focus:outline-none focus:ring-2 focus:ring-sky-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selected ? 'text-zinc-50' : 'text-zinc-600'
          )}
        >
          {selected ? format(selected, 'dd MMM yyyy') : placeholder}
          <CalendarIcon size={15} className="text-zinc-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
