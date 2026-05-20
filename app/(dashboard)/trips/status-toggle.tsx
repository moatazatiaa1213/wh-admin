'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tripId: string
  current: 'published' | 'draft'
}

export function StatusToggle({ tripId, current }: Props) {
  const [value, setValue] = useState(current)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleChange(next: 'published' | 'draft') {
    setValue(next)
    startTransition(async () => {
      await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      router.refresh()
    })
  }

  const isPublished = value === 'published'

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={e => handleChange(e.target.value as 'published' | 'draft')}
      className={`text-xs font-semibold rounded-full px-2.5 py-1 border cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors
        ${isPending ? 'opacity-50 cursor-wait' : ''}
        ${isPublished
          ? 'bg-sky-950/60 border-sky-800/60 text-sky-400'
          : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
        }`}
    >
      <option value="draft">Draft</option>
      <option value="published">Published</option>
    </select>
  )
}
