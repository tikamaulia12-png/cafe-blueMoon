'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { CheckCircle2, Clock, XCircle, ShoppingBag, User, CheckCheck } from 'lucide-react'

// Tipe data rincian item pesanan beserta nama menu
type OrderItem = {
  id: number
  quantity: number
  price: number
  menu_id: number
  menus?: { name: string }
}

// Tipe data pesanan kasir beserta status pembayaran & daftar itemnya
type Order = {
  id: number
  table_number: number
  customer_name?: string
  status: string
  payment_status: string
  total_price: number
  created_at: string
  order_items: OrderItem[]
}

export default function CashierPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Ambil data pesanan awal & aktifkan listener realtime saat tabel 'orders' berubah
  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('realtime-cashier-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Mengambil pesanan aktif dan menggabungkannya dengan item pesanan serta nama menu
  async function fetchOrders() {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['unpaid', 'pending', 'cooking', 'ready']) // Hanya tampilkan yang aktif berjalan
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const orderIds = ordersData.map((order) => order.id)
      const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds)
      const { data: menusData } = await supabase.from('menus').select('id, name')

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
      console.error('Error fetching cashier orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi Konfirmasi Pembayaran Tunai (mengubah status jadi 'pending' agar masuk antrean dapur)
  async function handleConfirmPayment(orderId: number) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'pending', payment_status: 'paid' })
        .eq('id', orderId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Gagal memproses pembayaran.')
    }
  }

  // Fungsi Menyelesaikan Pesanan (Pesanan Diambil Pelanggan -> Hilang dari Layar Status)
  async function handleCompleteOrder(orderId: number) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error completing order:', error)
      alert('Gagal menyelesaikan pesanan.')
    }
  }

  // Membatalkan pesanan yang belum dibayar
  async function handleCancelOrder(orderId: number) {
    if (!confirm('Yakin ingin membatalkan pesanan ini?')) return
    try {
      const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('Gagal membatalkan pesanan.')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 p-6">
      {/* Header Dashboard Kasir & Counter Pesanan Aktif */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          {/* Gambar ikon kasir */}
          <img
            src="/ikon-kasir.png"
            alt="blueMoon Logo"
            className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dashboard Kasir</h1>
            <p className="text-gray-400 text-xs mt-0.5">Konfirmasi pembayaran tunai & selesaikan pesanan yang sudah diambil</p>
          </div>
        </div>
        <div className="bg-gray-100 text-gray-900 font-bold px-4 py-2 rounded-2xl text-xs border border-gray-200 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-blue-600" /> Active Orders: {orders.length}
        </div>
      </header>

      {/* Daftar Kartu Pesanan Aktif */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-20">Memuat data kasir...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-700">Tidak Ada Pesanan Aktif</h2>
            <p className="text-gray-400 text-xs mt-1">Semua transaksi telah selesai diproses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  {/* Nomor Antrean & Badge Status Pesanan */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400 block font-bold uppercase">Nomor Antrean</span>
                      <span className="text-2xl font-black text-blue-600">#{order.table_number}</span>
                    </div>

                    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                      order.status === 'unpaid'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : order.status === 'ready'
                        ? 'bg-green-50 text-green-600 border border-green-200 animate-pulse'
                        : 'bg-blue-50 text-blue-600 border border-blue-200'
                    }`}>
                      {order.status === 'unpaid' ? 'Belum Bayar' : order.status}
                    </span>
                  </div>

                  {/* Informasi Nama Pemesan */}
                  <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 p-3 rounded-2xl mb-4">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Atas Nama</span>
                      <span className="text-sm font-bold text-gray-900">{order.customer_name || 'Pelanggan'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(order.created_at).toLocaleString('id-ID')}</span>
                  </div>

                  {/* Rincian Item yang Dipesan */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item Dipesan:</p>
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-sm">
                        <span className="font-semibold text-gray-700">{item.menus?.name || 'Menu'}</span>
                        <span className="text-gray-500 font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Tagihan & Tombol Aksi Kasir */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-500 font-medium">Total Tagihan</span>
                    <span className="font-black text-gray-900 text-lg">
                      Rp {Number(order.total_price).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Tombol Aksi Berdasarkan Status Pesanan */}
                  {order.status === 'unpaid' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Batalkan
                      </button>
                      <button
                        onClick={() => handleConfirmPayment(order.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Sudah Bayar
                      </button>
                    </div>
                  ) : order.status === 'ready' ? (
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md animate-bounce"
                    >
                      <CheckCheck className="w-4 h-4" /> Selesai / Pesanan Diambil
                    </button>
                  ) : (
                    <div className="bg-gray-100 text-center py-2.5 rounded-xl text-xs font-semibold text-gray-500">
                      ⏳ Sedang diproses dapur...
                    </div>
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