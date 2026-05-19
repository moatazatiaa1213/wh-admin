'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Airline } from '@/lib/types'

const airlineSchema = z.object({
  name: z.string().min(1, 'Required'),
  baggage_allowance: z.string().min(1, 'Required'),
  photo: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})

type AirlineFormValues = z.infer<typeof airlineSchema>

interface AirlineFormProps {
  airline?: Airline
}

export function AirlineForm({ airline }: AirlineFormProps) {
  const router = useRouter()
  const isEditing = !!airline

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AirlineFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(airlineSchema) as any,
    defaultValues: {
      name: airline?.name ?? '',
      baggage_allowance: airline?.baggage_allowance ?? '',
      photo: airline?.photo ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: AirlineFormValues) => {
      const url = isEditing ? `/api/airlines/${airline.id}` : '/api/airlines'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save airline')
      return res.json()
    },
    onSuccess: () => {
      router.push('/airlines')
      router.refresh()
    },
  })

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const lbl = 'text-xs font-medium text-zinc-400'
  const err = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={lbl}>Airline Name</Label>
        <Input {...register('name')} className={f} placeholder="e.g. Pakistan International Airlines (PIA)" />
        {errors.name && <p className={err}>{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Baggage Allowance</Label>
        <Input {...register('baggage_allowance')} className={f} placeholder="e.g. 23kg checked + 7kg carry-on" />
        {errors.baggage_allowance && <p className={err}>{errors.baggage_allowance.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Airline Logo URL <span className="text-zinc-600">(optional)</span></Label>
        <Input {...register('photo')} type="url" className={f} placeholder="https://…" />
        {errors.photo && <p className={err}>{errors.photo.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save airline. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#1c1c1c]">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
        >
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Airline' : 'Create Airline'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
