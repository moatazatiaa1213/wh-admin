import { Badge } from '@/components/ui/badge'

type Status = 'confirmed' | 'pending' | 'cancelled' | 'published' | 'draft'

const config: Record<Status, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-950/60 text-green-400 border border-green-900/50 hover:bg-green-950/60',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-950/60 text-amber-400 border border-amber-900/50 hover:bg-amber-950/60',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-950/60 text-red-400 border border-red-900/50 hover:bg-red-950/60',
  },
  published: {
    label: 'Published',
    className: 'bg-green-950/60 text-green-400 border border-green-900/50 hover:bg-green-950/60',
  },
  draft: {
    label: 'Draft',
    className: 'bg-amber-950/60 text-amber-400 border border-amber-900/50 hover:bg-amber-950/60',
  },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  }
  return (
    <Badge className={`text-[10px] font-semibold px-2 py-0.5 rounded ${className}`}>
      {label}
    </Badge>
  )
}
