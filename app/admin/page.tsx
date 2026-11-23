'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
// Import ikon dari lucide-react untuk kartu statistik & indikator
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  Check,
  AlertTriangle,
  BarChart2
} from 'lucide-react'
// Import komponen grafik dari recharts untuk visualisasi data
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts'

// Tipe data pesanan dari tabel 'orders'
type Order = {
  id: number
  status: string
  total_price: number
  created_at: string
  payment_method?: string
}

// Tipe data produk/menu dari tabel 'menus'
type MenuItem = {
  id: number
  name: string
  category: string
  stock: number
  price: number
  image_url?: string
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)

  // State metrik statistik utama dashboard
  const [todaySales, setTodaySales] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [activeProductsCount, setActiveProductsCount] = useState(0)
  const [activeUsersCount, setActiveUsersCount] = useState(0)
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)

  // State data grafik dan daftar ringkasan
  const [salesTrend, setSalesTrend] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Order[]>([])
  const [paymentMethodsData, setPaymentMethodsData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<MenuItem[]>([])

  const targetSales = 5000000 // Target bulanan (dalam Rupiah)

  // Mengambil data awal & mengaktifkan langganan realtime Supabase
  useEffect(() => {
    fetchRealDashboardData()

    // Mendengarkan perubahan realtime pada tabel orders, order_items, dan users
    const channel = supabase
      .channel('realtime-dashboard-real')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchRealDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchRealDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchRealDashboardData()
      })
      .subscribe()

    // Membersihkan channel realtime saat komponen di-unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Mengambil dan mengolah seluruh data dashboard dari Supabase
  async function fetchRealDashboardData() {
    try {
      setLoading(true)

      // 1. Ambil data Orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersErr) throw ordersErr
      const orders: Order[] = ordersData || []
      setTotalOrders(orders.length)
      setRecentTransactions(orders.slice(0, 5))

      // 2. Ambil data Users untuk menghitung jumlah total karyawan/user asli
      const { count: usersCount, error: usersErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (!usersErr && usersCount !== null) {
        setActiveUsersCount(usersCount)
      }

      // 3. Ambil data Menus / Products
      const { data: menusData, error: menusErr } = await supabase
        .from('menus')
        .select('*')

      if (menusErr) throw menusErr
      const menus: MenuItem[] = menusData || []
      setActiveProductsCount(menus.length)

      // Cek stok menipis (stok <= 5)
      const lowStock = menus.filter(m => m.stock !== null && m.stock <= 5)
      setLowStockItems(lowStock)

      // 4. Ambil data Order Items untuk perhitungan produk terlaris & kategori
      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*, menus(name, category, price, image_url)')

      if (itemsErr) throw itemsErr
      const items = itemsData || []

      // Hitung Pendapatan Hari Ini
      const todayStr = new Date().toISOString().split('T')[0]
      const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr) && o.status !== 'cancelled')
      const todaySalesVal = todayOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)
      setTodaySales(todaySalesVal)

      // Pending Orders
      const pending = orders.filter(o => o.status === 'pending' || o.status === 'cooking').length
      setPendingOrdersCount(pending)

      // Total & Avg Revenue
      const totalRev = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_price || 0), 0)
      setMonthlyRevenue(totalRev)
      const avg = orders.length > 0 ? orders.reduce((s, o) => s + Number(o.total_price || 0), 0) / orders.length : 0
      setAvgOrderValue(avg)

      // 5. Hitung Sales Trend (7 Hari Terakhir)
      const last7DaysMap: { [key: string]: { day: string; sales: number } } = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateString = d.toISOString().split('T')[0]
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' })
        last7DaysMap[dateString] = { day: dayName, sales: 0 }
      }

      orders.forEach(o => {
        if (o.created_at && o.status !== 'cancelled') {
          const dStr = o.created_at.split('T')[0]
          if (last7DaysMap[dStr]) {
            last7DaysMap[dStr].sales += Number(o.total_price || 0)
          }
        }
      })
      setSalesTrend(Object.values(last7DaysMap))
      
      // 6. Hitung Revenue berdasarkan Kategori Menu (Makanan=hijau, Minuman=biru, Snack=kuning, Dessert=merah)
      const categoryRevenueMap: { [key: string]: number } = {}
      let totalCategorySales = 0

      items.forEach((item: any) => {
        const cat = item.menus?.category || 'Makanan'
        const subTotal = Number(item.quantity || 0) * Number(item.price || 0)
        categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + subTotal
        totalCategorySales += subTotal
      })

      const catColors: { [key: string]: string } = {
        'Makanan': '#22c55e', // Hijau
        'Minuman': '#3b82f6', // Biru
        'Snack': '#eab308',   // Kuning
        'Dessert': '#ef4444'  // Merah
      }

      const formattedCategoryData = Object.keys(categoryRevenueMap).map(cat => ({
        name: cat,
        value: totalCategorySales > 0 ? Math.round((categoryRevenueMap[cat] / totalCategorySales) * 100) : 0,
        color: catColors[cat] || '#6b7280'
      }))
      setCategoryData(formattedCategoryData)

      // 7. Hitung Metode Pembayaran (Tunai=Kuning, QRIS=Biru)
      let cashTotal = 0
      let qrisTotal = 0

      orders.forEach(o => {
        const rawMethod = (o.payment_method || '').toLowerCase().trim()
        if (rawMethod === 'qris') {
          qrisTotal += 1
        } else if (rawMethod === 'cash') {
          cashTotal += 1
        } else {
          if (o.status === 'unpaid') {
            cashTotal += 1
          } else {
            qrisTotal += 1
          }
        }
      })

      const formattedPayment = [
        { name: 'Tunai', value: cashTotal, color: '#eab308' }, // Kuning
        { name: 'QRIS', value: qrisTotal, color: '#3b82f6' },  // Biru
      ].filter(item => item.value > 0)

      setPaymentMethodsData(formattedPayment)

      // 8. Hitung Status Transaksi
      const statusMap: { [key: string]: number } = { Selesai: 0, Pending: 0, Dibatalkan: 0 }
      orders.forEach(o => {
        const s = o.status?.toLowerCase()
        if (s === 'completed') statusMap.Selesai += 1
        else if (s === 'cancelled') statusMap.Dibatalkan += 1
        else statusMap.Pending += 1
      })
      setStatusData([
        { status: 'Dibatalkan', count: statusMap.Dibatalkan, fill: '#ef4444' },
        { status: 'Selesai', count: statusMap.Selesai, fill: '#22c55e' },
        { status: 'Pending', count: statusMap.Pending, fill: '#eab308' },
      ])

      // 9. Produk Terlaris (diurutkan dari jumlah terjual terbanyak, ambil 5 teratas)
      const productSalesMap: { [key: string]: { name: string; category: string; sold: number; total_sales: number; image_url: string } } = {}
      items.forEach((item: any) => {
        if (item.menus) {
          const mName = item.menus.name
          if (!productSalesMap[mName]) {
            productSalesMap[mName] = {
              name: mName,
              category: item.menus.category || 'Makanan',
              sold: 0,
              total_sales: 0,
              image_url: item.menus.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'
            }
          }
          productSalesMap[mName].sold += Number(item.quantity || 0)
          productSalesMap[mName].total_sales += Number(item.quantity || 0) * Number(item.price || 0)
        }
      })

      const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.sold - a.sold).slice(0, 5)
      setTopProducts(sortedProducts)

    } catch (err) {
      console.error('Error fetching real data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Persentase capaian target penjualan bulanan (maksimal 100%)
  const targetPercentage = Math.min(Math.round((monthlyRevenue / targetSales) * 100), 100)

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-800 p-6 space-y-6">
      
      {/* Grid Kartu Statistik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Penjualan Hari Ini</span>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">Rp {todaySales.toLocaleString('id-ID')}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Update langsung dari pesanan hari ini</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Total Pesanan</span>
            <ShoppingBag className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">{totalOrders}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Keseluruhan transaksi masuk</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Produk Aktif</span>
            <Package className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">{activeProductsCount}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Menu terdaftar di database</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Pengguna Aktif</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">{activeUsersCount}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Total karyawan terdaftar</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Rata-rata Nilai Pesanan</span>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">Rp {Math.round(avgOrderValue).toLocaleString('id-ID')}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Rata-rata nominal per transaksi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Total Pendapatan</span>
            <Calendar className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">Rp {monthlyRevenue.toLocaleString('id-ID')}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Akumulasi pesanan selesai</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-700">Pesanan Pending</span>
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mt-3">{pendingOrdersCount}</h2>
          <p className="text-[11px] font-medium text-gray-600 mt-1">Menunggu penyelesaian dapur</p>
        </div>
      </div>

      {/* Grafik Tren Penjualan 7 Hari & Pendapatan per Kategori */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Area Tren Penjualan */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900">Tren Penjualan — 7 Hari Terakhir</h3>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorSalesReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
                <Tooltip formatter={(val: any) => `Rp ${Number(val).toLocaleString('id-ID')}`} />
                <Area type="monotone" dataKey="sales" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#colorSalesReal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Donat Kategori Menu */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-900">Pendapatan Berdasarkan Kategori</h3>
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-44 relative flex items-center justify-center">
            {categoryData.length === 0 ? (
              <p className="text-xs font-semibold text-gray-600">Belum ada data kategori</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-2 mt-4 text-xs">
            {categoryData.map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-gray-700 font-semibold">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar Target Penjualan Bulanan */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" /> Target Penjualan Bulanan
          </h3>
          <span className="text-xs font-bold text-gray-700">Target: Rp {targetSales.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between items-baseline my-3">
          <div>
            <span className="text-2xl font-black text-gray-900">Rp {monthlyRevenue.toLocaleString('id-ID')}</span>
          </div>
          <span className="text-xs font-bold text-gray-900">{targetPercentage}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-rose-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${targetPercentage}%` }}
          />
        </div>
        <p className="text-[11px] font-semibold text-gray-600 mt-2">
          Rp {Math.max(0, targetSales - monthlyRevenue).toLocaleString('id-ID')} lagi untuk mencapai target bulan ini.
        </p>
      </div>

      {/* Grafik Metode Pembayaran & Status Transaksi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Donat Metode Pembayaran */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Metode Pembayaran</h3>
          <div className="h-48 flex items-center justify-center">
            {paymentMethodsData.length === 0 ? (
              <p className="text-xs font-semibold text-gray-600">Belum ada data pembayaran</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethodsData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-6 text-xs font-bold text-gray-700 mt-2">
            {paymentMethodsData.map(p => (
              <span key={p.name} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </div>

        {/* Grafik Batang Status Transaksi */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Status Transaksi</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daftar Produk Terlaris & Peringatan Stok Menipis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produk Terlaris */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Produk Terlaris</h3>
          {topProducts.length === 0 ? (
            <p className="text-xs font-semibold text-gray-600 text-center py-6">Belum ada riwayat item terjual.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-bold w-3">{idx + 1}</span>
                    <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-lg object-cover" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{item.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-bold">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-gray-600 font-semibold text-[11px]">Terjual: {item.sold} item</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">Rp {item.total_sales.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peringatan Stok Menipis */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-900">Peringatan Stok Menipis</h3>
            <AlertTriangle className="w-4 h-4 text-gray-500" />
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-600">
              <Check className="w-6 h-6 text-green-500 mb-2" />
              <p className="text-xs font-bold">Semua stok menu aman dan mencukupi!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100 text-xs">
                  <span className="font-bold text-red-900">{item.name}</span>
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-md font-bold">Stok: {item.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </main>
  )
}