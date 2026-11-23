'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Clock, Flame, CheckCircle2, BellRing } from 'lucide-react'

// Tipe data rincian item pesanan beserta nama menu terkait
type OrderItem = {
  id: number
  quantity: number
  price: number
  menu_id: number
  menus?: {
    name: string
  }
}

// Tipe data pesanan dari tabel 'orders' beserta daftar itemnya
type Order = {
  id: number
  table_number: number
  customer_name?: string
  status: 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled' | 'unpaid'
  created_at: string
  order_items: OrderItem[]
}

export default function OrderStatusPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Ambil data antrean awal dan aktifkan update realtime saat tabel 'orders' berubah
  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('realtime-customer-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Mengambil antrean aktif lalu menggabungkannya dengan detail item dan nama menu
  async function fetchOrders() {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['unpaid', 'pending', 'cooking', 'ready'])
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const orderIds = ordersData.map((order) => order.id)

      // Ambil item pesanan dan daftar nama menu untuk dipetakan ke tiap order
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)

      const { data: menusData } = await supabase
        .from('menus')
        .select('id, name')

      const menuMap = new Map(menusData?.map((m) => [m.id, m.name]))

      const combinedOrders = ordersData.map((order) => ({
        ...order,
        order_items: (itemsData || [])
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            menus: { name: menuMap.get(item.menu_id) || 'Menu' },
          })),
      }))

      setOrders(combinedOrders)
    } catch (error) {
      console.error('Error fetching order status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 p-6">
      {/* Header Halaman & Tombol Buat Pesanan Baru */}
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          {/* Gambar ikon antrean */}
          <img
            src="/ikon-antean.png"
            alt="blueMoon Logo"
            className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Layar Status Antrean</h1>
            <p className="text-gray-500 text-sm">Pantau nomor antrean dan progres pembuatan pesanan Anda</p>
          </div>
        </div>
        <a
          href="/"
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-4 py-2 rounded-xl transition text-sm"
        >
          + Buat Pesanan Baru
        </a>
      </header>

      {/* Daftar Kartu Antrean Aktif */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-20">Memuat status antrean...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-700">Belum Ada Antrean Aktif</h2>
            <p className="text-gray-400 text-sm mt-1">Silakan lakukan pemesanan melalui halaman utama.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`rounded-2xl p-6 bg-white border shadow-sm flex flex-col justify-between transition ${
                  order.status === 'ready'
                    ? 'border-green-500 ring-2 ring-green-500/20 bg-green-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div>
                  {/* Info Nomor Antrean, Nama Pelanggan & Badge Status */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400 block font-bold uppercase">Nomor Antrean</span>
                      <span className="text-2xl font-black text-blue-600">#{order.table_number}</span>
                      <span className="text-xs font-semibold text-gray-600 block mt-0.5">
                        {order.customer_name || 'Pelanggan'}
                      </span>
                    </div>

                    {/* Indikator status progres pesanan */}
                    <div>
                      {order.status === 'unpaid' && (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-1 rounded-full font-bold">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran Kasir
                        </span>
                      )}
                      {order.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-200 text-xs px-3 py-1 rounded-full font-bold">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Dapur
                        </span>
                      )}
                      {order.status === 'cooking' && (
                        <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-600 border border-sky-200 text-xs px-3 py-1 rounded-full font-bold">
                          <Flame className="w-3.5 h-3.5 animate-pulse" /> Sedang Dimasak
                        </span>
                      )}
                      {order.status === 'ready' && (
                        <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm animate-bounce">
                          <BellRing className="w-3.5 h-3.5" /> SIAP DIAMBIL!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rincian Menu yang Dipesan */}
                  <div className="space-y-2 mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu Dipesan:</p>
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-sm">
                        <span className="font-semibold text-gray-700">{item.menus?.name || 'Menu'}</span>
                        <span className="text-gray-500 font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}