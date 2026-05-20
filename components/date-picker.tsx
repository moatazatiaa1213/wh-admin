'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

interface DatePickerProps {
  value?: string            // yyyy-MM-dd
  onChange: (iso: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
}: DatePickerProps) {
  const today = new Date()
  const selected = value ? new Date(value + 'T00:00:00') : null

  const [open, setOpen]           = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState(selected?.getMonth()    ?? today.getMonth())
  const [viewYear,  setViewYear]  = React.useState(selected?.getFullYear() ?? today.getFullYear())

  // Sync view when value changes externally
  React.useEffect(() => {
    if (selected) {
      setViewMonth(selected.getMonth())
      setViewYear(selected.getFullYear())
    }
  }, [value])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function handleDayClick(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
  }

  // Build calendar cells
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const displayLabel = selected
    ? selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-[#1c1c1c]',
            'bg-[#09090b] px-3 py-2 text-sm text-left transition-colors',
            'hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            displayLabel ? 'text-zinc-50' : 'text-zinc-500',
          )}
        >
          {displayLabel ?? placeholder}
          <CalendarIcon size={14} className="shrink-0 text-zinc-500" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-4">
        {/* ── Month / Year header ── */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-sm font-semibold text-zinc-100">
            {MONTHS[viewMonth]} {viewYear}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Weekday headers ── */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div
              key={d}
              className="h-8 flex items-center justify-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* ── Day grid ── */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />

            const isSel =
              selected &&
              selected.getDate()     === day &&
              selected.getMonth()    === viewMonth &&
              selected.getFullYear() === viewYear

            const isToday =
              today.getDate()     === day &&
              today.getMonth()    === viewMonth &&
              today.getFullYear() === viewYear

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  'h-9 w-full flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                  isSel
                    ? 'bg-sky-500 text-white hover:bg-sky-400'
                    : isToday
                    ? 'text-sky-400 font-bold hover:bg-zinc-800'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
