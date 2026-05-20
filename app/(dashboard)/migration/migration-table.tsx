'use client'

import { useState, useCallback } from 'react'
import { MultiSelect } from '@/components/multi-select'
import { DatePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import type { Trip, City, Hotel, Airline, Excursion } from '@/lib/types'

interface TripState {
  city_ids: string[]
  hotel_ids: string[]
  airline_ids: string[]
  excursion_ids: string[]
  price_adult: string
  price_child: string
  travel_date: string
  end_date: string
  status: 'idle' | 'saving' | 'saved' | 'error'
}

interface Props {
  trips: Trip[]
  cities: City[]
  hotels: Hotel[]
  airlines: Airline[]
  excursions: Excursion[]
}

export function MigrationTable({ trips, cities, hotels, airlines, excursions }: Props) {
  const [states, setStates] = useState<Record<string, TripState>>(() =>
    Object.fromEntries(trips.map(t => [t.id, {
      city_ids:     t.city_ids,
      hotel_ids:    t.hotel_ids,
      airline_ids:  t.airline_ids,
      excursion_ids: t.excursion_ids,
      price_adult:  t.price_adult ? String(t.price_adult) : '',
      price_child:  t.price_child ? String(t.price_child) : '',
      travel_date:  t.travel_date ?? '',
      end_date:     t.end_date ?? '',
      status:       'idle',
    }]))
  )

  const update = useCallback((id: string, patch: Partial<TripState>) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  async function saveTrip(trip: Trip) {
    const s = states[trip.id]
    update(trip.id, { status: 'saving' })
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trip,
          city_ids:      s.city_ids,
          hotel_ids:     s.hotel_ids,
          airline_ids:   s.airline_ids,
          excursion_ids: s.excursion_ids,
          price_adult:   parseFloat(s.price_adult) || 0,
          price_child:   parseFloat(s.price_child) || 0,
          travel_date:   s.travel_date,
          end_date:      s.end_date,
        }),
      })
      if (!res.ok) throw new Error()
      update(trip.id, { status: 'saved' })
    } catch {
      update(trip.id, { status: 'error' })
    }
  }

  async function saveAll() {
    await Promise.all(trips.map(t => saveTrip(t)))
  }

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500 h-8 text-xs'

  const savedCount = Object.values(states).filter(s => s.status === 'saved').length

  return (
    <div className="space-y-4">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {savedCount} / {trips.length} saved
        </p>
        <Button
          onClick={saveAll}
          className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8 px-4 cursor-pointer"
        >
          Save All
        </Button>
      </div>

      {/* Trip cards */}
      <div className="space-y-3">
        {trips.map(trip => {
          const s = states[trip.id]
          return (
            <div
              key={trip.id}
              className={`bg-[#111111] border rounded-lg p-4 transition-colors ${
                s.status === 'saved'  ? 'border-emerald-800/60' :
                s.status === 'error' ? 'border-red-800/60' :
                'border-[#1c1c1c]'
              }`}
            >
              {/* Trip header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{trip.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{trip.destination || 'No destination'} · ID {trip.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === 'saved'  && <CheckCircle size={16} className="text-emerald-400" />}
                  {s.status === 'error'  && <AlertCircle size={16} className="text-red-400" />}
                  {s.status === 'saving' && <Loader2 size={16} className="text-sky-400 animate-spin" />}
                  <Button
                    size="sm"
                    onClick={() => saveTrip(trip)}
                    disabled={s.status === 'saving'}
                    className="h-7 px-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                {/* Cities */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Cities</p>
                  <MultiSelect
                    options={cities.map(c => ({ id: c.id, label: c.name, sublabel: c.country }))}
                    selected={s.city_ids}
                    onChange={ids => update(trip.id, { city_ids: ids })}
                    placeholder="Select cities…"
                    emptyMessage="No cities in library"
                  />
                </div>

                {/* Hotels */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Hotels</p>
                  <MultiSelect
                    options={hotels.map(h => ({ id: h.id, label: h.name, sublabel: h.location }))}
                    selected={s.hotel_ids}
                    onChange={ids => update(trip.id, { hotel_ids: ids })}
                    placeholder="Select hotels…"
                    emptyMessage="No hotels in library"
                  />
                </div>

                {/* Airlines */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Airlines</p>
                  <MultiSelect
                    options={airlines.map(a => ({ id: a.id, label: a.name, sublabel: a.baggage_allowance }))}
                    selected={s.airline_ids}
                    onChange={ids => update(trip.id, { airline_ids: ids })}
                    placeholder="Select airlines…"
                    emptyMessage="No airlines in library"
                  />
                </div>

                {/* Excursions */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Excursions</p>
                  <MultiSelect
                    options={excursions.map(e => ({ id: e.id, label: e.name, sublabel: e.description?.slice(0, 60) }))}
                    selected={s.excursion_ids}
                    onChange={ids => update(trip.id, { excursion_ids: ids })}
                    placeholder="Select excursions…"
                    emptyMessage="No excursions in library"
                  />
                </div>

                {/* Adult Price */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Adult Price (EGP)</p>
                  <Input
                    type="number"
                    value={s.price_adult}
                    onChange={e => update(trip.id, { price_adult: e.target.value })}
                    placeholder="e.g. 59950"
                    className={f}
                  />
                </div>

                {/* Child Price */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Child Price (EGP)</p>
                  <Input
                    type="number"
                    value={s.price_child}
                    onChange={e => update(trip.id, { price_child: e.target.value })}
                    placeholder="e.g. 47950"
                    className={f}
                  />
                </div>

                {/* Travel Date */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Travel Date</p>
                  <DatePicker
                    value={s.travel_date}
                    onChange={val => update(trip.id, { travel_date: val })}
                    placeholder="Pick date"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">End Date</p>
                  <DatePicker
                    value={s.end_date}
                    onChange={val => update(trip.id, { end_date: val })}
                    placeholder="Pick date"
                  />
                </div>

              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Save All */}
      {trips.length > 3 && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={saveAll}
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8 px-4 cursor-pointer"
          >
            Save All ({trips.length} trips)
          </Button>
        </div>
      )}
    </div>
  )
}
