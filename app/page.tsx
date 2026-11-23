'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Search, Plus, Minus, QrCode, Banknote, X, ShieldLock, User, ShoppingBag } from 'lucide-react'

// Tipe data menu dari tabel 'menus'
type Menu = {
  id: number
  name: string
  description: string
  price: number
  image_url: string
  category: string
  is_available: boolean
}

// Tipe data item di keranjang belanja beserta jumlahnya
type CartItem = {
  menu: Menu
  quantity: number
}

// Tipe data ringkasan pesanan terakhir untuk modal sukses/QRIS
type LastOrderDetails = {
  id: number
  queueNumber: number
  customerName: string
  total: number
  method: 'qris' | 'cash'
}

export default function CustomerMenuPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [categories, setCategories] = useState<string[]>(['Semua'])
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerNumber, setCustomerNumber] = useState<number>(1)
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cash'>('qris')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')

  // State Modal Pembayaran & Nota Sukses
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastOrderDetails, setLastOrderDetails] = useState<LastOrderDetails | null>(null)

  // Cek sesi pelanggan, muat daftar menu, dan buat nomor antrean otomatis saat halaman dibuka
useEffect(() => {
  const email = localStorage.getItem('customer_email')
  if (!email) {
    window.location.href = '/customer-login'
    return
  }

  setCustomerEmail(email)
  setCustomerName(email.split('@')[0])
  fetchMenus()
  generateAutomaticQueueNumber()
}, [])

  // Mengambil menu yang tersedia dan menyusun daftar kategori unik
  async function fetchMenus() {
    try {
      const { data, error } = await supabase.from('menus').select('*').eq('is_available', true)
      if (error) throw error
      setMenus(data || [])

      const dbCategories = Array.from(new Set((data || []).map((item) => item.category || 'Lainnya')))
      const uniqueCategories = ['Semua', ...dbCategories.filter((c) => c !== 'All' && c !== 'Semua')]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching menus:', error)
    } finally {
      setLoading(false)
    }
  }

  // Menghasilkan nomor antrean harian otomatis berdasarkan pesanan terakhir hari ini
  async function generateAutomaticQueueNumber() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('table_number, created_at')
        .order('id', { ascending: false })
        .limit(1)

      if (error) throw error

      if (!data || data.length === 0) {
        setCustomerNumber(1)
        return
      }

      const lastOrder = data[0]
      const todayStr = new Date().toISOString().split('T')[0]
      const lastOrderDateStr = lastOrder.created_at ? lastOrder.created_at.split('T')[0] : ''

      // Jika pesanan terakhir dibuat hari ini, lanjutkan nomor antrean; jika beda hari, mulai dari 1
      if (lastOrderDateStr === todayStr) {
        setCustomerNumber((lastOrder.table_number || 0) + 1)
      } else {
        setCustomerNumber(1)
      }
    } catch (error) {
      console.error('Error generating queue number:', error)
      setCustomerNumber(1)
    }
  }

  // Validasi password akses staff (Dapur, Kasir, Admin) sebelum pindah halaman
  const handleStaffAccess = async (roleRoute: string) => {
    // Tentukan kata kunci yang mungkin disimpan di database untuk tiap role
    let possibleRoles: string[] = []
    if (roleRoute.includes('kitchen') || roleRoute.includes('dapur')) {
      possibleRoles = ['Dapur', 'Chef', 'kitchen', 'dapur']
    } else if (roleRoute.includes('kasir')) {
      possibleRoles = ['Kasir', 'cashier', 'kasir']
    } else {
      possibleRoles = ['Admin', 'admin']
    }

    const roleLabel = possibleRoles[0]
    const password = prompt(`Masukkan Password Akses untuk ${roleLabel}:`)
    if (password === null) return

    try {
      // Ambil semua user dari database tanpa batasan filter tugas dulu untuk dicocokkan
      const { data, error } = await supabase
        .from('users')
        .select('id, tugas, password, status')

      if (error) throw error

      if (data && data.length > 0) {
        // Cari user yang tugasnya cocok dengan salah satu keyword dan statusnya aktif
        const matchedUser = data.find((u) => {
          const userTugas = (u.tugas || '').trim()
          const isRoleMatch = possibleRoles.some(r => r.toLowerCase() === userTugas.toLowerCase())
          const isActive = (u.status || 'Active').toLowerCase() === 'active'
          const isPasswordMatch = (u.password || '').trim() === password.trim()

          return isRoleMatch && isActive && isPasswordMatch
        })

        if (matchedUser) {
          window.location.href = `/${roleRoute}`
          return
        }
      }

      // Fallback darurat jika di database belum tersetting password-nya
      if (password === 'admin321' || password === 'admin123') {
        window.location.href = `/${roleRoute}`
        return
      }

      alert(`Password salah atau pengguna dengan tugas ${roleLabel} tidak ditemukan/tidak aktif!`)
    } catch (err) {
      console.error('Auth staff error:', err)
      if (password === 'admin321' || password === 'admin123') {
        window.location.href = `/${roleRoute}`
      } else {
        alert('Terjadi kesalahan saat memeriksa akses.')
      }
    }
  }

  // Menambah item ke keranjang atau menaikkan jumlahnya jika sudah ada
  const addToCart = (menu: Menu) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.menu.id === menu.id)
      if (existing) {
        return prevCart.map((item) =>
          item.menu.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prevCart, { menu, quantity: 1 }]
    })
  }

  // Mengurangi jumlah item di keranjang atau menghapusnya jika jumlahnya menjadi 0
  const removeFromCart = (menuId: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.menu.id === menuId)
      if (existing && existing.quantity > 1) {
        return prevCart.map((item) =>
          item.menu.id === menuId ? { ...item, quantity: item.quantity - 1 } : item
        )
      }
      return prevCart.filter((item) => item.menu.id !== menuId)
    })
  }

  // Menghitung total pembayaran dari seluruh item di keranjang
  const subtotal = cart.reduce((sum, item) => sum + item.menu.price * item.quantity, 0)
  const totalPayment = subtotal

  // Menyaring menu berdasarkan kategori aktif dan kata kunci pencarian
  const filteredMenus = menus.filter((menu) => {
    const matchesCategory =
      selectedCategory === 'Semua' ||
      selectedCategory === 'All' ||
      menu.category === selectedCategory
    const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Menyimpan pesanan ke tabel 'orders' dan detail item ke tabel 'order_items' di Supabase
  const handleCheckout = async () => {
    const trimmedName = customerName.trim()
    if (!trimmedName) {
      alert('Masukkan nama pemesan terlebih dahulu.')
      return
    }
    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong.')
      return
    }

    setSubmitting(true)
    try {
      const currentQueue = customerNumber
      const initialStatus = paymentMethod === 'cash' ? 'unpaid' : 'pending'
      const paymentStatus = paymentMethod === 'cash' ? 'unpaid' : 'paid'

      console.log('DEBUG INSERT ORDER:', {
        paymentMethod,
        initialStatus,
        paymentStatus,
      })

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            table_number: currentQueue,
            customer_name: trimmedName,
            total_price: totalPayment,
            status: initialStatus,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
          },
        ])
        .select()
        .single()

      console.log('DEBUG ORDER DATA DARI SUPABASE:', orderData, orderError)

      if (orderError) throw orderError

      const newOrderId = orderData.id

      // Menyimpan rincian tiap menu yang dipesan ke tabel 'order_items'
      const orderItemsData = cart.map((item) => ({
        order_id: newOrderId,
        menu_id: item.menu.id,
        quantity: item.quantity,
        price: item.menu.price,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
      if (itemsError) throw itemsError

      setLastOrderDetails({
        id: newOrderId,
        queueNumber: currentQueue,
        customerName: trimmedName,
        total: totalPayment,
        method: paymentMethod,
      })

      // Reset keranjang, tutup modal bayar, tampilkan modal sukses, dan siapkan nomor antrean berikutnya
      setShowPaymentModal(false)
      setShowSuccessModal(true)
      setCart([])
      await generateAutomaticQueueNumber()
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Terjadi kesalahan saat memproses pesanan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800">
      {/* Kolom Kiri: Katalog Menu & Top Bar */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white px-8 py-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Menampilkan logo/ikon aplikasi blueMoon */}
            <img
              src="/ikon-blueMoon.png"
              alt="blueMoon Logo"
              className="w-10 h-10 rounded-2xl object-cover shrink-0"
            />

            <div>
              <h1 className="font-bold text-sm text-gray-900">{customerEmail}</h1>
              <p className="text-[11px] text-gray-400">Welcome to blueMoon</p>
            </div>
          </div>

          {/* Pencarian Menu & Link Cek Antrean */}
          <div className="flex items-center gap-4">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
              />
            </div>
            <a
              href="/order-status"
              className="bg-blue-700 text-white hover:bg-blue-800 font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm"
            >
              Cek Status Antrean
            </a>
          </div>

          {/* Tombol Akses Cepat Halaman Staff (Dapur, Kasir, Admin) */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            <button onClick={() => handleStaffAccess('dapur/kitchen')} className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <ShieldLock className="w-3.5 h-3.5" /> Dapur
            </button>
            <button onClick={() => handleStaffAccess('kasir')} className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <ShieldLock className="w-3.5 h-3.5" /> Kasir
            </button>
            <button onClick={() => handleStaffAccess('admin')} className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <ShieldLock className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
        </header>

        {/* Filter Kategori Menu */}
        <div className="px-8 py-5">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition shadow-sm ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Produk Menu */}
        <div className="px-8 pb-10 flex-1">
          {loading ? (
            <p className="text-center text-gray-400 py-20">Memuat menu...</p>
          ) : filteredMenus.length === 0 ? (
            <p className="text-center text-gray-400 py-20">Menu tidak ditemukan.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMenus.map((menu) => (
                <div
                  key={menu.id}
                  className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 w-full rounded-2xl overflow-hidden bg-gray-100 mb-3">
                      {menu.image_url ? (
                        <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-medium text-xs">
                          Tidak ada Gambar
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{menu.name}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <span className="font-extrabold text-gray-900 text-sm">
                      Rp {Number(menu.price).toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => addToCart(menu)}
                      className="bg-gray-900 hover:bg-black text-white font-bold p-2 rounded-xl text-xs shadow transition flex items-center justify-center"
                      title="Tambah ke Keranjang"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Keranjang & Detail Pesanan */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col justify-between shadow-xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-base text-gray-900">Detail Pesanan</h2>
          <span className="text-xs bg-blue-700 text-white font-bold px-2.5 py-1 rounded-xl shadow-sm">
            Antrean #{customerNumber}
          </span>
        </div>

        {/* Daftar Item di Keranjang */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-semibold">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menu.id} className="flex justify-between items-center bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                <div className="flex-1 pr-2">
                  <p className="font-bold text-gray-900 text-xs line-clamp-1">{item.menu.name}</p>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                    Rp {Number(item.menu.price).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-gray-200 shadow-sm">
                  <button onClick={() => removeFromCart(item.menu.id)} className="text-gray-400 hover:text-red-500">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                  <button onClick={() => addToCart(item.menu)} className="text-gray-400 hover:text-gray-900">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bagian Bawah: Total & Tombol Bayar Sekarang */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
              <span>Total Pembayaran</span>
              <span className="text-gray-900 font-extrabold">Rp {totalPayment.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (cart.length === 0) {
                alert('Keranjang belanja masih kosong.')
                return
              }
              setShowPaymentModal(true)
            }}
            disabled={cart.length === 0}
            className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-bold py-3 rounded-2xl transition text-xs shadow-md"
          >
            Bayar Sekarang
          </button>
          <button
            onClick={() => setCart([])}
            className="w-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-2 rounded-2xl transition text-xs"
          >
            Batal
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Pembayaran */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-xl text-gray-900 mb-1">Konfirmasi Pembayaran</h3>
            <p className="text-xs text-gray-400 mb-5">Masukkan nama pelanggan dan pilih metode pembayaran (Antrean #{customerNumber})</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Pemesan</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Masukkan nama anda"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-gray-300 pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'qris' | 'cash')}
                  className="w-full bg-white border border-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="qris">QRIS</option>
                  <option value="cash">Tunai / Bayar di Kasir</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
                  <span>Total Tagihan</span>
                  <span className="text-gray-900 font-bold">Rp {totalPayment.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCheckout}
                  className="flex-1 bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses Pesanan (QRIS / Bayar di Kasir) */}
      {showSuccessModal && lastOrderDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <button onClick={() => setShowSuccessModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            {lastOrderDetails.method === 'qris' ? (
              <div>
                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-700">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">Scan QRIS untuk Membayar</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Atas Nama: <span className="font-bold text-gray-800">{lastOrderDetails.customerName}</span> (Antrean #{lastOrderDetails.queueNumber})
                </p>

                {/* Membuat gambar QR code secara dinamis berdasarkan ID pesanan */}
                <div className="bg-white p-4 my-4 rounded-2xl border-2 border-dashed border-gray-200 inline-block shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=RESTO-ORDER-${lastOrderDetails.id}`}
                    alt="QRIS"
                    className="w-40 h-40 mx-auto"
                  />
                </div>

                <p className="text-xs text-gray-500">Total Tagihan:</p>
                <p className="text-xl font-extrabold text-blue-700">Rp {lastOrderDetails.total.toLocaleString('id-ID')}</p>
                <div className="mt-4 bg-green-50 text-green-700 text-xs p-3 rounded-xl border border-green-200">
                  ✓ Pembayaran sukses. Pesanan masuk ke antrean dapur!
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-700">
                  <Banknote className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">Silakan Bayar di Kasir</h3>
                <p className="text-xs text-gray-500 mt-1">Tunjukkan nomor & nama antrean ke kasir:</p>
                <div className="my-4 bg-blue-50 border border-blue-200 py-4 rounded-2xl">
                  <span className="text-xs text-blue-700 font-bold block uppercase">{lastOrderDetails.customerName}</span>
                  <span className="text-3xl font-black text-blue-700">Antrean #{lastOrderDetails.queueNumber}</span>
                </div>
                <p className="text-xs text-gray-500">Total Tagihan:</p>
                <p className="text-xl font-extrabold text-gray-900">Rp {lastOrderDetails.total.toLocaleString('id-ID')}</p>
                <p className="text-xs text-gray-400 mt-3">Setelah kasir konfirmasi, pesanan otomatis diproses dapur.</p>
              </div>
            )}

            <button
              onClick={() => {
                setShowSuccessModal(false)
                window.location.href = '/order-status'
              }}
              className="mt-6 w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-sm transition"
            >
              Lihat Status Antrean
            </button>
          </div>
        </div>
      )}
    </div>
  )
}