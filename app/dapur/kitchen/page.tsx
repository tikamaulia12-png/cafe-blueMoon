'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Clock, CheckCircle2, Flame } from 'lucide-react'

// Tipe data rincian item pesanan beserta nama menu
type OrderItem = {
  id: number
  quantity: number
  price: number
  menu_id: number
  menus?: {
    name: string
  }
}

// Tipe data pesanan dapur beserta daftar itemnya
type Order = {
  id: number
  table_number: number
  status: 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled'
  total_price: number
  created_at: string
  order_items: OrderItem[]
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Mengambil pesanan awal & mendengarkan perubahan realtime pada tabel 'orders'
  useEffect(() => {
    fetchOrders()

    // Setup Supabase Realtime untuk mendengarkan perubahan pada tabel 'orders'
    const channel = supabase
      .channel('realtime-orders')
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

  // Mengambil pesanan aktif (pending/cooking) dan menggabungkannya dengan item serta nama menu
  async function fetchOrders() {
    try {
      // 1. Ambil data pesanan utama yang statusnya pending atau cooking
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'cooking'])
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const orderIds = ordersData.map((order) => order.id)

      // 2. Ambil data item pesanan secara terpisah (aman tanpa relasi foreign key)
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)

      if (itemsError) throw itemsError

      // 3. Ambil data menu untuk mencocokkan namanya
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('id, name')

      if (menusError) throw menusError

      const menuMap = new Map(menusData?.map((m) => [m.id, m.name]))

      // 4. Gabungkan data order, order_items, dan nama menu secara manual
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
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi untuk mengubah status pesanan (Masak / Siap)
  async function updateStatus(orderId: number, newStatus: 'cooking' | 'ready') {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Gagal memperbarui status pesanan.')
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header Sistem Dapur & Indikator Live */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          {/* Gambar ikon dapur */}
          <img
            src="/ikon-dapur.png"
            alt="blueMoon Logo"
            className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-bold">Sistem Dapur</h1>
            <p className="text-gray-400 text-sm">Pesanan Masuk! Cepat Masak!</p>
          </div>
        </div>
        {/* Indikator status koneksi realtime */}
        <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-medium text-gray-300">Live Connected</span>
        </div>
      </header>

      {/* Daftar Kartu Antrean Pesanan Dapur */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-20">Memuat pesanan dapur...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-800">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-300">Semua Pesanan Selesai!</h2>
            <p className="text-gray-500 text-sm mt-1">Belum ada pesanan baru dari pelanggan saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className={`rounded-2xl p-5 border flex flex-col justify-between transition ${
                  order.status === 'pending' 
                    ? 'bg-gray-800 border-blue-500/50 shadow-lg shadow-blue-900/20' 
                    : 'bg-gray-800 border-blue-500/50 shadow-lg shadow-blue-900/20'
                }`}
              >
                <div>
                  {/* Nomor Antrean & Badge Status */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
                    <span className="text-xl font-black text-blue-400">
                      Antrean #{order.table_number}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      order.status === 'pending' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {order.status === 'pending' ? 'Baru (Pending)' : 'Sedang Dimasak'}
                    </span>
                  </div>

                  {/* Waktu Pesanan Masuk */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(order.created_at).toLocaleTimeString('id-ID')}</span>
                  </div>

                  {/* Daftar Item Menu yang Harus Disiapkan */}
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Item Pesanan:</p>
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-900/60 px-3 py-2 rounded-lg">
                        <span className="font-medium text-gray-200 text-sm">{item.menus?.name || 'Menu'}</span>
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tombol Aksi Update Status Dapur */}
                <div>
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => updateStatus(order.id, 'cooking')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                      <Flame className="w-4 h-4" /> Mulai Masak
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Selesai / Ready (Ambil)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}