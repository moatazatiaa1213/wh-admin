'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadField } from '@/components/image-upload-field'
import type { Hotel } from '@/lib/types'

const hotelSchema = z.object({
  name: z.string().min(1, 'Required'),
  stars: z.coerce.number().int().min(1).max(5),
  location: z.string().min(1, 'Required'),
  photo: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  website: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  map_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})

type HotelFormValues = z.infer<typeof hotelSchema>

interface HotelFormProps {
  hotel?: Hotel
}

export function HotelForm({ hotel }: HotelFormProps) {
  const router = useRouter()
  const isEditing = !!hotel

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HotelFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(hotelSchema) as any,
    defaultValues: {
      name: hotel?.name ?? '',
      stars: hotel?.stars ?? 3,
      location: hotel?.location ?? '',
      photo: hotel?.photo ?? '',
      website: hotel?.website ?? '',
      map_url: hotel?.map_url ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: HotelFormValues) => {
      const url = isEditing ? `/api/hotels/${hotel.id}` : '/api/hotels'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save hotel')
      return res.json()
    },
    onSuccess: () => {
      router.push('/hotels')
      router.refresh()
    },
  })

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const lbl = 'text-xs font-medium text-zinc-400'
  const err = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={lbl}>Hotel Name</Label>
        <Input {...register('name')} className={f} placeholder="e.g. Serena Hotel Gilgit" />
        {errors.name && <p className={err}>{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Stars (1–5)</Label>
          <Input {...register('stars')} type="number" min="1" max="5" className={f} placeholder="4" />
          {errors.stars && <p className={err}>{errors.stars.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>Location</Label>
          <Input {...register('location')} className={f} placeholder="e.g. Gilgit City, Gilgit-Baltistan" />
          {errors.location && <p className={err}>{errors.location.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Google Maps Link <span className="text-zinc-600">(optional)</span></Label>
        <Input {...register('map_url')} type="url" className={f} placeholder="https://maps.google.com/…" />
        {errors.map_url && <p className={err}>{errors.map_url.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Website URL <span className="text-zinc-600">(optional)</span></Label>
        <Input {...register('website')} type="url" className={f} placeholder="https://…" />
        {errors.website && <p className={err}>{errors.website.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Photo <span className="text-zinc-600">(optional)</span></Label>
        <ImageUploadField
          value={watch('photo') ?? ''}
          onChange={url => setValue('photo', url, { shouldValidate: true })}
        />
        {errors.photo && <p className={err}>{errors.photo.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save hotel. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#1c1c1c]">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
        >
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Hotel' : 'Create Hotel'}
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
