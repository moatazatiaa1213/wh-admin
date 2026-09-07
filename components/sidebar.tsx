'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  BookOpen,
  Users,
  Package,
  Plane,
  MapPin,
  Building2,
  PlaneTakeoff,
  Compass,
  ArrowRightLeft,
  UserCog,
} from 'lucide-react'

const mainNav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/trips', label: 'Trips', icon: Globe },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/packages', label: 'Packages', icon: Package },
]

const libraryNav = [
  { href: '/cities', label: 'Cities', icon: MapPin },
  { href: '/hotels', label: 'Hotels', icon: Building2 },
  { href: '/airlines', label: 'Airlines', icon: PlaneTakeoff },
  { href: '/excursions', label: 'Excursions', icon: Compass },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#09090b] border-r border-[#1c1c1c] flex flex-col z-30">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1c1c1c]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-sky-500 flex items-center justify-center flex-shrink-0">
            <Plane size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-50 leading-none tracking-tight">WHHolidays</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-2 pb-2">
          Main
        </p>
        {mainNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
              isActive(href)
                ? 'bg-zinc-900 text-zinc-50'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <Icon size={15} className={isActive(href) ? 'text-sky-500' : 'text-zinc-600'} />
            {label}
          </Link>
        ))}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-2 pt-4 pb-2">
          Tools
        </p>
        <Link
          href="/migration"
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
            isActive('/migration')
              ? 'bg-zinc-900 text-zinc-50'
              : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
          }`}
        >
          <ArrowRightLeft size={15} className={isActive('/migration') ? 'text-sky-500' : 'text-zinc-600'} />
          Migration
        </Link>

        <Link
          href="/users"
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
            isActive('/users')
              ? 'bg-zinc-900 text-zinc-50'
              : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
          }`}
        >
          <UserCog size={15} className={isActive('/users') ? 'text-sky-500' : 'text-zinc-600'} />
          Users
        </Link>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-2 pt-4 pb-2">
          Library
        </p>
        {libraryNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
              isActive(href)
                ? 'bg-zinc-900 text-zinc-50'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <Icon size={15} className={isActive(href) ? 'text-sky-500' : 'text-zinc-600'} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#1c1c1c]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-300 truncate">Admin</p>
            <p className="text-[10px] text-zinc-600 truncate">WHHolidays</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
