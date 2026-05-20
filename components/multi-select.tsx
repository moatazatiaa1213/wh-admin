'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'

export interface SelectOption {
  id: string
  label: string
  sublabel?: string
}

interface MultiSelectProps {
  options: SelectOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  emptyMessage?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items…',
  emptyMessage = 'No options available',
}: MultiSelectProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef<HTMLDivElement>(null)
  const searchRef         = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus the search input when the dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const selectedOptions = options.filter(o => selected.includes(o.id))

  const filteredOptions = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  return (
    <div ref={ref} className="relative">
      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedOptions.map(opt => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs rounded-md px-2 py-1"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => toggle(opt.id)}
                className="hover:text-sky-200 transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-[#09090b] border border-[#1c1c1c] text-sm text-zinc-400 rounded-md px-3 py-2 hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <span>{selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selected`}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#111111] border border-[#1c1c1c] rounded-lg shadow-xl">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1c1c1c]">
            <Search size={13} className="text-zinc-500 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-xs text-zinc-500 text-center">{emptyMessage}</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-3 py-3 text-xs text-zinc-500 text-center">No results for &ldquo;{query}&rdquo;</p>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/60 transition-colors text-left"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected.includes(opt.id) ? 'bg-sky-500 border-sky-500' : 'border-[#1c1c1c]'
                    }`}
                  >
                    {selected.includes(opt.id) && <Check size={10} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-200">{opt.label}</p>
                    {opt.sublabel && <p className="text-[11px] text-zinc-500">{opt.sublabel}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
