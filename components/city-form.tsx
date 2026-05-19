'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { City } from '@/lib/types'

const citySchema = z.object({
  name: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
  location: z.string().min(1, 'Required'),
})

type CityFormValues = z.infer<typeof citySchema>

interface CityFormProps {
  city?: City
}

export function CityForm({ city }: CityFormProps) {
  const router = useRouter()
  const isEditing = !!city

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CityFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(citySchema) as any,
    defaultValues: {
      name: city?.name ?? '',
      country: city?.country ?? '',
      location: city?.location ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CityFormValues) => {
      const url = isEditing ? `/api/cities/${city.id}` : '/api/cities'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save city')
      return res.json()
    },
    onSuccess: () => {
      router.push('/cities')
      router.refresh()
    },
  })

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const lbl = 'text-xs font-medium text-zinc-400'
  const err = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={lbl}>City Name</Label>
        <Input {...register('name')} className={f} placeholder="e.g. Hunza" />
        {errors.name && <p className={err}>{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Country</Label>
        <Input {...register('country')} className={f} placeholder="e.g. Pakistan" />
        {errors.country && <p className={err}>{errors.country.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Location</Label>
        <Input {...register('location')} className={f} placeholder="e.g. Hunza-Nagar District, Gilgit-Baltistan" />
        {errors.location && <p className={err}>{errors.location.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save city. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#1c1c1c]">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
        >
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update City' : 'Create City'}
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
