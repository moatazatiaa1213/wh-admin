'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Package, Trip } from '@/lib/types'

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  trip_id: z.string().min(1, 'Please select a trip'),
  inclusions: z.string().min(1, 'Inclusions are required'),
  max_people: z.coerce.number().int().positive('Must be a positive integer'),
})

type PackageFormValues = z.infer<typeof packageSchema>

interface PackageFormProps {
  pkg?: Package
  trips: Trip[]
}

export function PackageForm({ pkg, trips }: PackageFormProps) {
  const router = useRouter()
  const isEditing = !!pkg

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PackageFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(packageSchema) as any,
    defaultValues: {
      name: pkg?.name ?? '',
      price: pkg?.price ?? undefined,
      trip_id: pkg?.trip_id ?? '',
      inclusions: pkg?.inclusions ?? '',
      max_people: pkg?.max_people ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: PackageFormValues) => {
      const url = isEditing ? `/api/packages/${pkg.id}` : '/api/packages'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save package')
      return res.json()
    },
    onSuccess: () => {
      router.push('/packages')
      router.refresh()
    },
  })

  const fieldClass = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const labelClass = 'text-xs font-medium text-zinc-400'
  const errorClass = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={labelClass}>Package Name</Label>
        <Input {...register('name')} className={fieldClass} placeholder="e.g. Hunza Standard" />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Price (USD)</Label>
          <Input {...register('price')} type="number" min="0" step="0.01" className={fieldClass} placeholder="1200" />
          {errors.price && <p className={errorClass}>{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Max People</Label>
          <Input {...register('max_people')} type="number" min="1" className={fieldClass} placeholder="10" />
          {errors.max_people && <p className={errorClass}>{errors.max_people.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Linked Trip</Label>
        <Select
          defaultValue={watch('trip_id')}
          onValueChange={val => setValue('trip_id', val)}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Select a trip…" />
          </SelectTrigger>
          <SelectContent className="bg-[#111111] border-[#1c1c1c]">
            {trips.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-zinc-300 focus:bg-zinc-800">
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.trip_id && <p className={errorClass}>{errors.trip_id.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Inclusions</Label>
        <Textarea {...register('inclusions')} className={fieldClass} rows={3} placeholder="Hotel, breakfast, transport, guide…" />
        {errors.inclusions && <p className={errorClass}>{errors.inclusions.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save package. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Package' : 'Create Package'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer">
          Cancel
        </Button>
      </div>
    </form>
  )
}
