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
import type { Trip } from '@/lib/types'

const tripSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  destination: z.string().min(1, 'Destination is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  duration: z.coerce.number().int().positive('Duration must be a positive integer'),
  featured_image: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  status: z.enum(['draft', 'published']),
})

type TripFormValues = z.infer<typeof tripSchema>

interface TripFormProps {
  trip?: Trip
}

export function TripForm({ trip }: TripFormProps) {
  const router = useRouter()
  const isEditing = !!trip

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tripSchema) as any,
    defaultValues: {
      title: trip?.title ?? '',
      description: trip?.description ?? '',
      destination: trip?.destination ?? '',
      price: trip?.price ?? undefined,
      duration: trip?.duration ?? undefined,
      featured_image: trip?.featured_image ?? '',
      status: trip?.status ?? 'draft',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: TripFormValues) => {
      const url = isEditing ? `/api/trips/${trip.id}` : '/api/trips'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save trip')
      return res.json()
    },
    onSuccess: () => {
      router.push('/trips')
      router.refresh()
    },
  })

  const fieldClass = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const labelClass = 'text-xs font-medium text-zinc-400'
  const errorClass = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={labelClass}>Title</Label>
        <Input {...register('title')} className={fieldClass} placeholder="e.g. Hunza Valley Explorer" />
        {errors.title && <p className={errorClass}>{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Description</Label>
        <Textarea {...register('description')} className={fieldClass} rows={4} placeholder="Describe the trip..." />
        {errors.description && <p className={errorClass}>{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Destination</Label>
          <Input {...register('destination')} className={fieldClass} placeholder="e.g. Hunza, Gilgit-Baltistan" />
          {errors.destination && <p className={errorClass}>{errors.destination.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Status</Label>
          <Select
            defaultValue={watch('status')}
            onValueChange={val => setValue('status', val as 'draft' | 'published')}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#1c1c1c]">
              <SelectItem value="draft" className="text-zinc-300 focus:bg-zinc-800">Draft</SelectItem>
              <SelectItem value="published" className="text-zinc-300 focus:bg-zinc-800">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Price (USD)</Label>
          <Input {...register('price')} type="number" min="0" step="0.01" className={fieldClass} placeholder="1200" />
          {errors.price && <p className={errorClass}>{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Duration (days)</Label>
          <Input {...register('duration')} type="number" min="1" className={fieldClass} placeholder="7" />
          {errors.duration && <p className={errorClass}>{errors.duration.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Featured Image URL <span className="text-zinc-600">(optional)</span></Label>
        <Input {...register('featured_image')} type="url" className={fieldClass} placeholder="https://..." />
        {errors.featured_image && <p className={errorClass}>{errors.featured_image.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save trip. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
        >
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Trip' : 'Create Trip'}
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
