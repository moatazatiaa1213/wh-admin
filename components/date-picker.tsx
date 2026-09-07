'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface DatePickerProps {
  value?: string            // yyyy-MM-dd
  onChange: (iso: string) => void
  placeholder?: string
  disabled?: boolean
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate()
}

const selectClass = cn(
  'h-10 rounded-md border border-[#1c1c1c] bg-[#09090b] px-2 text-sm text-zinc-50',
  'hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500',
  'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
)

export function DatePicker({
  value,
  onChange,
  disabled,
}: DatePickerProps) {
  const currentYear = new Date().getFullYear()
  const years = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => currentYear - 1 + i), // currentYear-1 .. currentYear+5
    [currentYear],
  )

  const [day, setDay]     = React.useState<number | ''>('')
  const [month, setMonth] = React.useState<number | ''>('')   // 1-12
  const [year, setYear]   = React.useState<number | ''>('')

  // Parse an incoming ISO value (including on mount, and whenever it changes externally)
  React.useEffect(() => {
    if (!value) { setDay(''); setMonth(''); setYear(''); return }
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return
    setYear(parseInt(m[1], 10))
    setMonth(parseInt(m[2], 10))
    setDay(parseInt(m[3], 10))
  }, [value])

  function emit(nextDay: number | '', nextMonth: number | '', nextYear: number | '') {
    if (nextDay === '' || nextMonth === '' || nextYear === '') return
    const clampedDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth))
    const iso = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
    onChange(iso)
  }

  function handleDayChange(v: string) {
    const next = v === '' ? '' : parseInt(v, 10)
    setDay(next)
    emit(next, month, year)
  }
  function handleMonthChange(v: string) {
    const next = v === '' ? '' : parseInt(v, 10)
    setMonth(next)
    // Re-clamp day against the new month's length
    const clampedDay = day !== '' && next !== '' ? Math.min(day, daysInMonth(year || currentYear, next)) : day
    if (clampedDay !== day) setDay(clampedDay)
    emit(clampedDay, next, year)
  }
  function handleYearChange(v: string) {
    const next = v === '' ? '' : parseInt(v, 10)
    setYear(next)
    const clampedDay = day !== '' && month !== '' && next !== '' ? Math.min(day, daysInMonth(next, month)) : day
    if (clampedDay !== day) setDay(clampedDay)
    emit(clampedDay, month, next)
  }

  const maxDay = (year !== '' && month !== '') ? daysInMonth(year, month) : 31
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1)

  return (
    <div className="flex gap-2">
      <select
        aria-label="Day"
        value={day}
        onChange={e => handleDayChange(e.target.value)}
        disabled={disabled}
        className={cn(selectClass, 'w-[72px]')}
      >
        <option value="" disabled>Day</option>
        {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <select
        aria-label="Month"
        value={month}
        onChange={e => handleMonthChange(e.target.value)}
        disabled={disabled}
        className={cn(selectClass, 'flex-1')}
      >
        <option value="" disabled>Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>

      <select
        aria-label="Year"
        value={year}
        onChange={e => handleYearChange(e.target.value)}
        disabled={disabled}
        className={cn(selectClass, 'w-[90px]')}
      >
        <option value="" disabled>Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}
