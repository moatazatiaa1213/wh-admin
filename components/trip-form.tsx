'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { MultiSelect }        from '@/components/multi-select'
import { ImageUploadField }   from '@/components/image-upload-field'
import { DatePicker } from '@/components/date-picker'
import { formatBaggage } from '@/lib/format-baggage'
import type { Trip, City, Hotel, Airline, Excursion } from '@/lib/types'

// ─── Schema ──────────────────────────────────────────────────────────────────

const tripSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  trip_number: z.string().min(1, 'Trip number is required'),
  description: z.string().min(1, 'Description is required'),
  destination: z.string().min(1, 'Destination is required'),
  travel_date: z.string().min(1, 'Travel date is required'),
  end_date: z.string().min(1, 'End date is required'),
  duration_days: z.coerce.number().int().nonnegative(),
  duration_nights: z.coerce.number().int().nonnegative(),
  price_adult: z.coerce.number().positive('Must be greater than 0'),
  price_child: z.coerce.number().nonnegative('Must be 0 or more'),
  deposit: z.coerce.number().nonnegative('Must be 0 or more'),
  single_rate: z.coerce.number().nonnegative('Must be 0 or more'),
  featured_image: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  status: z.enum(['draft', 'published']),
  city_ids: z.array(z.string()),
  hotel_ids: z.array(z.string()),
  airline_ids: z.array(z.string()),
  excursion_ids: z.array(z.string()),
})

type TripFormValues = z.infer<typeof tripSchema>

interface TripFormProps {
  trip?: Trip
  cities: City[]
  hotels: Hotel[]
  airlines: Airline[]
  excursions: Excursion[]
  nextTripNumber?: string   // pre-filled for new trips, e.g. "WH-221"
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px bg-[#1c1c1c]" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TripForm({ trip, cities, hotels, airlines, excursions, nextTripNumber }: TripFormProps) {
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
      trip_number: trip?.trip_number ?? nextTripNumber ?? '',
      description: trip?.description ?? '',
      destination: trip?.destination ?? '',
      travel_date: trip?.travel_date ?? '',
      end_date: trip?.end_date ?? '',
      duration_days: trip?.duration_days ?? undefined,
      duration_nights: trip?.duration_nights ?? undefined,
      price_adult: trip?.price_adult ?? undefined,
      price_child: trip?.price_child ?? undefined,
      deposit: trip?.deposit ?? undefined,
      single_rate: trip?.single_rate ?? undefined,
      featured_image: trip?.featured_image ?? '',
      status: trip?.status ?? 'draft',
      city_ids: trip?.city_ids ?? [],
      hotel_ids: trip?.hotel_ids ?? [],
      airline_ids: trip?.airline_ids ?? [],
      excursion_ids: trip?.excursion_ids ?? [],
    },
  })

  // ── Nights per selected city — the source of truth for trip duration ──────
  // (travel_date/end_date are independently editable and no longer reconciled
  // against duration; see plan notes on this tradeoff)
  const [cityNights, setCityNights] = useState<Record<string, number>>(trip?.city_nights ?? {})
  const cityIds = watch('city_ids')

  // Keep cityNights in sync with the selected city list: prune removed
  // cities, default newly-added ones to 1 night.
  useEffect(() => {
    setCityNights(prev => {
      const next: Record<string, number> = {}
      for (const id of cityIds) next[id] = prev[id] ?? 1
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityIds.join(',')])

  // Duration is always the sum of per-city nights (+1 day)
  useEffect(() => {
    const nights = Object.values(cityNights).reduce((a, b) => a + b, 0)
    setValue('duration_nights', nights)
    setValue('duration_days', nights + 1)
  }, [cityNights, setValue])

  // ── Day-by-day itinerary — plain state, merged into the payload on submit
  // (same pattern as cityNights above; not part of the zod schema) ──────────
  type ItineraryDay = { day: number; title: string; description: string }
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(trip?.itinerary ?? [])

  function addDay() {
    setItinerary(prev => [...prev, { day: prev.length + 1, title: '', description: '' }])
  }
  function removeDay(index: number) {
    setItinerary(prev => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 })))
  }
  function updateDay(index: number, field: 'title' | 'description', value: string) {
    setItinerary(prev => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }

  const mutation = useMutation({
    mutationFn: async (data: TripFormValues) => {
      const url = isEditing ? `/api/trips/${trip.id}` : '/api/trips'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, city_nights: cityNights, itinerary }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to save trip')
      }
      return res.json()
    },
    onSuccess: () => {
      router.push('/trips')
      router.refresh()
    },
  })

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const lbl = 'text-xs font-medium text-zinc-400'
  const err = 'text-xs text-red-400 mt-1'

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5 max-w-3xl">

      {/* ── API error banner ── */}
      {mutation.isError && (
        <div className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {(mutation.error as Error).message}
        </div>
      )}

      {/* ── Basic Info ── */}
      <SectionHeader title="Basic Information" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Trip Title</Label>
          <Input {...register('title')} className={f} placeholder="e.g. Hunza Valley Explorer" />
          {errors.title && <p className={err}>{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>Trip Number</Label>
          <Input {...register('trip_number')} className={f} placeholder="e.g. WH-001" />
          {errors.trip_number && <p className={err}>{errors.trip_number.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={lbl}>Description</Label>
        <Textarea {...register('description')} className={f} rows={3} placeholder="Describe the trip…" />
        {errors.description && <p className={err}>{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Destination</Label>
          <Input {...register('destination')} className={f} placeholder="e.g. Hunza, Gilgit-Baltistan" />
          {errors.destination && <p className={err}>{errors.destination.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>Status</Label>
          <Select
            defaultValue={watch('status')}
            onValueChange={val => setValue('status', val as 'draft' | 'published')}
          >
            <SelectTrigger className={f}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#1c1c1c]">
              <SelectItem value="draft" className="text-zinc-300 focus:bg-zinc-800">Draft</SelectItem>
              <SelectItem value="published" className="text-zinc-300 focus:bg-zinc-800">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Dates & Duration ── */}
      <SectionHeader title="Dates & Duration" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Travel Date</Label>
          <DatePicker
            value={watch('travel_date')}
            onChange={val => setValue('travel_date', val, { shouldValidate: true })}
            placeholder="Pick travel date"
          />
          {errors.travel_date && <p className={err}>{errors.travel_date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>End Date</Label>
          <DatePicker
            value={watch('end_date')}
            onChange={val => setValue('end_date', val, { shouldValidate: true })}
            placeholder="Pick end date"
          />
          {errors.end_date && <p className={err}>{errors.end_date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Duration (Days) <span className="text-zinc-600 font-normal">· auto (from city nights)</span></Label>
          <Input
            {...register('duration_days')}
            type="number"
            readOnly
            className={`${f} opacity-50 cursor-not-allowed select-none`}
            placeholder="Auto-calculated"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>Duration (Nights) <span className="text-zinc-600 font-normal">· auto (from city nights)</span></Label>
          <Input
            {...register('duration_nights')}
            type="number"
            readOnly
            className={`${f} opacity-50 cursor-not-allowed select-none`}
            placeholder="Auto-calculated"
          />
        </div>
      </div>

      {/* ── Pricing ── */}
      <SectionHeader title="Pricing (USD)" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Adult Price</Label>
          <Input {...register('price_adult')} type="number" min="0" step="0.01" className={f} placeholder="1200" />
          {errors.price_adult && <p className={err}>{errors.price_adult.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>Child Price</Label>
          <Input {...register('price_child')} type="number" min="0" step="0.01" className={f} placeholder="800" />
          {errors.price_child && <p className={err}>{errors.price_child.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={lbl}>Deposit</Label>
          <Input {...register('deposit')} type="number" min="0" step="0.01" className={f} placeholder="300" />
          {errors.deposit && <p className={err}>{errors.deposit.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={lbl}>Single Rate</Label>
          <Input {...register('single_rate')} type="number" min="0" step="0.01" className={f} placeholder="1450" />
          {errors.single_rate && <p className={err}>{errors.single_rate.message}</p>}
        </div>
      </div>

      {/* ── Featured Image ── */}
      <SectionHeader title="Featured Image" />

      <div className="space-y-1.5">
        <Label className={lbl}>Image <span className="text-zinc-600">(optional)</span></Label>
        <ImageUploadField
          value={watch('featured_image') ?? ''}
          onChange={url => setValue('featured_image', url)}
        />
        {errors.featured_image && <p className={err}>{errors.featured_image.message}</p>}
      </div>

      {/* ── Cities ── */}
      <SectionHeader title="Cities" />

      <div className="space-y-1.5">
        <Label className={lbl}>Select Cities</Label>
        <MultiSelect
          options={cities.map(c => ({ id: c.id, label: c.name, sublabel: `${c.country} · ${c.location}`, imageUrl: c.photo }))}
          selected={watch('city_ids')}
          onChange={ids => setValue('city_ids', ids)}
          placeholder="Select cities…"
          emptyMessage="No cities found. Create one in the Cities library."
        />
      </div>

      {cityIds.length > 0 && (
        <div className="space-y-2">
          <Label className={lbl}>Nights per City</Label>
          {cityIds.map(id => {
            const city = cities.find(c => c.id === id)
            return (
              <div key={id} className="flex items-center justify-between gap-3 bg-[#09090b] border border-[#1c1c1c] rounded-md px-3 py-2">
                <span className="text-sm text-zinc-300">{city?.name ?? id}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={cityNights[id] ?? 1}
                    onChange={e => setCityNights(prev => ({ ...prev, [id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-20 bg-[#111111] border border-[#1c1c1c] rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-xs text-zinc-500">nights</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Hotels ── */}
      <SectionHeader title="Hotels" />

      <div className="space-y-1.5">
        <Label className={lbl}>Select Hotels</Label>
        <MultiSelect
          options={hotels.map(h => ({ id: h.id, label: h.name, sublabel: `${'★'.repeat(h.stars)} · ${h.location}`, imageUrl: h.photo }))}
          selected={watch('hotel_ids')}
          onChange={ids => setValue('hotel_ids', ids)}
          placeholder="Select hotels…"
          emptyMessage="No hotels found. Create one in the Hotels library."
        />
      </div>

      {/* ── Airlines ── */}
      <SectionHeader title="Airlines" />

      <div className="space-y-1.5">
        <Label className={lbl}>Select Airlines</Label>
        <MultiSelect
          options={airlines.map(a => ({
            id: a.id,
            label: a.name,
            sublabel: [formatBaggage(a) || null, a.type ? `(${a.type})` : null].filter(Boolean).join(' · ') || undefined,
            imageUrl: a.photo,
          }))}
          selected={watch('airline_ids')}
          onChange={ids => setValue('airline_ids', ids)}
          placeholder="Select airlines…"
          emptyMessage="No airlines found. Create one in the Airlines library."
        />
      </div>

      {/* ── Excursions ── */}
      <SectionHeader title="Excursions" />

      <div className="space-y-1.5">
        <Label className={lbl}>Select Excursions</Label>
        <MultiSelect
          options={excursions.map(e => ({ id: e.id, label: e.name, sublabel: e.description.slice(0, 80) + (e.description.length > 80 ? '…' : '') }))}
          selected={watch('excursion_ids')}
          onChange={ids => setValue('excursion_ids', ids)}
          placeholder="Select excursions…"
          emptyMessage="No excursions found. Create one in the Excursions library."
        />
      </div>

      {/* ── Itinerary ── */}
      <SectionHeader title="Itinerary" />

      <div className="space-y-3">
        {itinerary.map((dayItem, index) => (
          <div key={index} className="space-y-2 bg-[#09090b] border border-[#1c1c1c] rounded-md px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">Day {dayItem.day}</span>
              <button
                type="button"
                onClick={() => removeDay(index)}
                className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
              >
                Remove
              </button>
            </div>
            <Input
              value={dayItem.title}
              onChange={e => updateDay(index, 'title', e.target.value)}
              className={f}
              placeholder="e.g. Arrival in Hunza & Attabad Lake"
            />
            <Textarea
              value={dayItem.description}
              onChange={e => updateDay(index, 'description', e.target.value)}
              className={f}
              rows={2}
              placeholder="Describe what happens on this day…"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          onClick={addDay}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer border border-dashed border-[#1c1c1c] w-full"
        >
          + Add Day
        </Button>
      </div>

      {/* ── Error / Submit ── */}
      {mutation.isError && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          Failed to save trip. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#1c1c1c]">
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
