'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImportResult } from '@/app/api/trips/import/route'

type Step = 'idle' | 'uploading' | 'done' | 'error'

export function TripImportDialog() {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState<Step>('idle')
  const [results, setResults] = useState<ImportResult[]>([])
  const [succeeded, setSucceeded] = useState(0)
  const [failed, setFailed]   = useState(0)
  const [globalErr, setGlobalErr] = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  function openDialog() {
    setStep('idle')
    setResults([])
    setGlobalErr('')
    setOpen(true)
  }

  function closeDialog() {
    if (step === 'uploading') return
    if (step === 'done') router.refresh()
    setOpen(false)
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setGlobalErr('Please upload an Excel file (.xlsx or .xls)')
      return
    }

    setStep('uploading')
    setGlobalErr('')

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res  = await fetch('/api/trips/import', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setGlobalErr(data.error ?? 'Import failed')
        setStep('error')
        return
      }

      setResults(data.results)
      setSucceeded(data.succeeded)
      setFailed(data.failed)
      setStep('done')
    } catch (e) {
      setGlobalErr(String(e))
      setStep('error')
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        className="border-[#1c1c1c] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer gap-1.5"
      >
        <Upload size={13} />
        Import
      </Button>

      {/* ── Backdrop + dialog ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDialog}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-2xl bg-[#111111] border border-[#1c1c1c] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1c1c]">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Import Trips from Excel</h2>
              </div>
              <button
                onClick={closeDialog}
                disabled={step === 'uploading'}
                className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Download template link ── */}
              <a
                href="/api/trips/template"
                download
                className="flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border border-dashed border-[#2a2a2a] hover:border-zinc-600 hover:bg-zinc-900/40 transition-colors group"
              >
                <Download size={15} className="text-sky-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                    Download Excel Template
                  </p>
                  <p className="text-xs text-zinc-500">
                    wh-trips-template.xlsx · includes field guide sheet
                  </p>
                </div>
              </a>

              {/* ── Step: idle — file drop zone ── */}
              {(step === 'idle' || step === 'error') && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                    ${dragOver
                      ? 'border-sky-500 bg-sky-950/20'
                      : 'border-[#2a2a2a] hover:border-zinc-600 hover:bg-zinc-900/30'
                    }`}
                >
                  <Upload size={28} className="text-zinc-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">
                      Drop your Excel file here, or <span className="text-sky-400">browse</span>
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">.xlsx or .xls · uses the template format</p>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={onInputChange}
                  />
                </div>
              )}

              {/* Error message */}
              {globalErr && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/50 text-sm text-red-400">
                  <XCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {globalErr}
                </div>
              )}

              {/* ── Step: uploading ── */}
              {step === 'uploading' && (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <Loader2 size={28} className="text-sky-400 animate-spin" />
                  <p className="text-sm text-zinc-400">Importing trips…</p>
                </div>
              )}

              {/* ── Step: done — results ── */}
              {step === 'done' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">
                        {succeeded} imported
                      </span>
                    </div>
                    {failed > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/40">
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-sm font-semibold text-red-400">
                          {failed} failed
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row-by-row table */}
                  <div className="rounded-lg border border-[#1c1c1c] overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1c1c1c] bg-[#0d0d0d]">
                          <th className="text-left px-3 py-2 text-zinc-500 font-medium w-12">Row</th>
                          <th className="text-left px-3 py-2 text-zinc-500 font-medium">Trip title</th>
                          <th className="text-left px-3 py-2 text-zinc-500 font-medium w-24">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map(r => (
                          <tr key={r.row} className="border-b border-[#1c1c1c] last:border-0">
                            <td className="px-3 py-2 text-zinc-600 font-mono">{r.row}</td>
                            <td className="px-3 py-2 text-zinc-300">{r.title}</td>
                            <td className="px-3 py-2">
                              {r.status === 'ok' ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <CheckCircle2 size={11} /> OK
                                </span>
                              ) : (
                                <span
                                  className="flex items-center gap-1 text-red-400 font-medium"
                                  title={r.error}
                                >
                                  <XCircle size={11} /> Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1c1c1c]">
              {step === 'done' ? (
                <Button
                  onClick={closeDialog}
                  className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer"
                >
                  Done
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={closeDialog}
                  disabled={step === 'uploading'}
                  className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
