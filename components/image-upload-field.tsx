'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
}

export function ImageUploadField({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      const fd  = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/media/upload', { method: 'POST', body: fd })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url ?? '')
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative w-full h-44 rounded-lg overflow-hidden border border-[#1c1c1c] bg-zinc-900 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Featured image preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-300
              hover:text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
              bg-black/60 text-zinc-300 text-xs hover:text-white hover:bg-black/80
              transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
          >
            {uploading
              ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
              : <><Upload size={12} /> Replace</>
            }
          </button>
        </div>
      )}

      {/* Drop zone (shown when no image) */}
      {!value && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed
            cursor-pointer transition-colors
            ${dragOver
              ? 'border-sky-500 bg-sky-950/20'
              : 'border-[#2a2a2a] hover:border-zinc-600 hover:bg-zinc-900/30'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {uploading
            ? <><Loader2 size={22} className="text-sky-400 animate-spin" /><p className="text-xs text-zinc-500">Uploading…</p></>
            : <><ImageIcon size={22} className="text-zinc-600" /><p className="text-xs text-zinc-500">Drop image here or <span className="text-sky-400">browse</span></p></>
          }
        </div>
      )}

      {/* URL fallback input */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Or paste an image URL…"
          className="flex-1 bg-[#09090b] border border-[#1c1c1c] rounded-md px-3 py-2 text-sm
            text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-800 border border-[#1c1c1c]
            text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700
            transition-colors disabled:opacity-40 cursor-pointer"
        >
          {uploading
            ? <Loader2 size={13} className="animate-spin" />
            : <Upload size={13} />
          }
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
