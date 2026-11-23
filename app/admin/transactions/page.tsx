'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

// Tipe data transaksi/pesanan sesuai kolom tabel 'orders'
type Order = {
  id: number
  table_number: number
  customer_name?: string
  status: string
  payment_method?: string | null
  total_price: number
  created_at: string
}

export default function AdminTransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Mengambil data transaksi saat halaman pertama kali dibuka
  useEffect(() => {
    fetchTransactions()
  }, [])

  // Mengambil seluruh data transaksi dari Supabase urut dari yang terbaru
  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Menentukan label metode pembayaran (Tunai / QRIS)
  function renderPaymentMethod(order: Order) {
    const method = (order.payment_method || '').toLowerCase()
    if (method === 'cash') return 'Tunai'
    if (method === 'qris') return 'QRIS'

    // Fallback untuk data lama sebelum kolom payment_method ada
    return order.status === 'unpaid' ? 'Tunai' : 'QRIS'
  }

  return (
    <div className="p-8">
      {/* Header Halaman Riwayat Transaksi */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Riwayat Transaksi</h1>
          <p className="text-gray-400 text-xs mt-0.5">Riwayat keseluruhan transaksi pembayaran yang masuk</p>
        </div>
      </div>

      {/* Tabel Riwayat Transaksi */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <p className="text-center text-gray-400 py-16">Memuat transaksi...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Belum ada transaksi.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4 text-center">Transaksi #</th>
                <th className="py-3 px-4 text-center">Customer</th>
                <th className="py-3 px-4 text-center">Antrean #</th>
                <th className="py-3 px-4 text-center">Jumlah</th>
                <th className="py-3 px-4 text-center">Metode Pembayaran</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                  {/* Format kode transaksi dengan padding 5 digit angka */}
                  <td className="py-3 px-4 font-bold text-gray-900 text-center">TRX-2026-{String(order.id).padStart(5, '0')}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800 text-center">{order.customer_name || 'Walk-in Customer'}</td>
                  <td className="py-3 px-4 font-bold text-orange-600 text-center">#{order.table_number}</td>
                  {/* Format nominal harga ke rupiah Indonesia */}
                  <td className="py-3 px-4 font-black text-gray-900 text-center">
                    Rp {Number(order.total_price).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-gray-600 font-medium text-center">
                    {renderPaymentMethod(order)}
                  </td>
                  {/* Badge warna status pesanan */}
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold uppercase ${
                      order.status === 'completed'
                        ? 'bg-green-50 text-green-600 border border-green-100'
                        : order.status === 'ready'
                        ? 'bg-gray-900 text-white'
                        : order.status === 'cancelled'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {order.status === 'unpaid' ? 'Pending' : order.status}
                    </span>
                  </td>
                  {/* Format tanggal & waktu transaksi sesuai lokal Indonesia */}
                  <td className="py-3 px-4 text-xs text-gray-500 font-medium text-center">
                    {order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}