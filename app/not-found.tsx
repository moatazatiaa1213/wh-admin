import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">404</p>
        <h1 className="text-2xl font-bold text-zinc-50 tracking-tight mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/">
          <Button className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
