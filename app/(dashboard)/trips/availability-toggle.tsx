'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tripId: string
  current: 'available' | 'completed'
}

export function AvailabilityToggle({ tripId, current }: Props) {
  const [value, setValue] = useState(current)

  // Sync with prop changes (e.g. after a bulk action + router.refresh())
  useEffect(() => { setValue(current) }, [current])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleChange(next: 'available' | 'completed') {
    setValue(next)
    startTransition(async () => {
      await fetch(`/api/trips/${tripId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      router.refresh()
    })
  }

  const isCompleted = value === 'completed'

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={e => handleChange(e.target.value as 'available' | 'completed')}
      className={`text-xs font-semibold rounded-full px-2.5 py-1 border cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors
        ${isPending ? 'opacity-50 cursor-wait' : ''}
        ${isCompleted
          ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
          : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
        }`}
    >
      <option value="available">Available</option>
      <option value="completed">Completed</option>
    </select>
  )
}
