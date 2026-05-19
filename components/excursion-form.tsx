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
import type { Excursion } from '@/lib/types'

const excursionSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  photo: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})

type ExcursionFormValues = z.infer<typeof excursionSchema>

interface ExcursionFormProps {
  excursion?: Excursion
}

export function ExcursionForm({ excursion }: ExcursionFormProps) {
  const router = useRouter()
  const isEditing = !!excursion

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExcursionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(excursionSchema) as any,
    defaultValues: {
      name: excursion?.name ?? '',
      description: excursion?.description ?? '',
      photo: excursion?.photo ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: ExcursionFormValues) => {
      const url = isEditing ? `/api/excursions/${excursion.id}` : '/api/excursions'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save excursion')
      return res.json()
    },
    onSuccess: () => {
      router.push('/excursions')
      router.refresh()
    },
  })

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const lbl = 'text-xs font-medium text-zinc-400'
  const err = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className={lbl}>Excursion Name</Label>
        <Input {...register('name')} className={f} placeholder="e.g. Attabad Lake Boat Ride" />
        {errors.name && <p className={err}>{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Description</Label>
        <Textarea {...register('description')} className={f} rows={4} placeholder="Describe this excursion…" />
        {errors.description && <p className={err}>{errors.description.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Photo URL <span className="text-zinc-600">(optional)</span></Label>
        <Input {...register('photo')} type="url" className={f} placeholder="https://…" />
        {errors.photo && <p className={err}>{errors.photo.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save excursion. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#1c1c1c]">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
        >
          {mutation.isPending ? 'Saving…' : isEditing ? 'Update Excursion' : 'Create Excursion'}
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
