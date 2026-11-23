'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, Utensils, History, ArrowLeft, Package, Users } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Menu', href: '/admin/menus', icon: Utensils },
    { name: 'Inventaris', href: '/admin/inventory', icon: Package },
    { name: 'Riwayat Transaksi', href: '/admin/transactions', icon: History },
    { name: 'Pengguna', href: '/admin/users', icon: Users },
  ]

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden">
      {/* Sidebar Kiri - Hitam */}
      <aside className="w-64 bg-black border-r border-gray-800 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/ikon-blueMoon.png"
              alt="blueMoon Logo"
              className="w-11 h-11 rounded-2xl object-cover shrink-0"
            />
            <div>
              <h1 className="font-bold text-white text-base">blueMoon</h1>
              <p className="text-xs text-gray-400">Admin blueMoon</p>
            </div>
          </div>

          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Manajemen</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-900 space-y-2">
          <a
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-blue-400 transition px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Menu Pelanggan
          </a>
        </div>
      </aside>

      {/* Konten Utama Kanan */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}