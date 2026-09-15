import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a date string for display.
 * Handles: empty/null/undefined → "—"
 * Handles: Tour Master DD/MM/YYYY format
 * Handles: unparseable strings → returns the raw string unchanged
 */
/**
 * Format a price for display. Single source of truth for the currency label
 * so it can't drift between admin pages / the PDF brochure again.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || amount === 0) return '—'
  return `${Number(amount).toLocaleString()} EGP`
}

export function formatDate(
  raw: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  if (!raw) return '—'

  // Normalise DD/MM/YYYY (Tour Master common format) → YYYY-MM-DD
  const parts = raw.split('/')
  const iso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : raw

  const d = new Date(iso)
  if (isNaN(d.getTime())) return raw // return raw string rather than "Invalid Date"

  return d.toLocaleDateString('en-GB', options)
}
