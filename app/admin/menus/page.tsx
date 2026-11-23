'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Plus, Eye, Edit3, Trash2, X, Image as ImageIcon, Search, Filter, MoreVertical } from 'lucide-react'

type Menu = {
  id: number
  name: string
  description?: string
  price: number
  image_url: string
  category: string
  is_available: boolean
  created_at?: string
  updated_at?: string
}

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [filteredMenus, setFilteredMenus] = useState<Menu[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // State untuk Pengaturan Halaman (Pagination)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // State untuk Modal & Mode Operasi (Add, Edit, View)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add')
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  // State untuk Form Input Data Produk
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Makanan')
  const [imageUrl, setImageUrl] = useState('')

  // Mengambil data saat komponen pertama kali dirender
  useEffect(() => {
    fetchMenus()
  }, [])

  // Fungsi untuk memfilter produk berdasarkan kata kunci pencarian
  useEffect(() => {
    const results = menus.filter(menu => 
      menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (menu.category && menu.category.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    setFilteredMenus(results)
    setCurrentPage(1)
  }, [searchQuery, menus])

  // Fungsi untuk mengambil data produk dari database Supabase
  async function fetchMenus() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('menus').select('*').order('id', { ascending: false })
      if (error) throw error
      setMenus(data || [])
      setFilteredMenus(data || [])
    } catch (error) {
      console.error('Error fetching menus:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi untuk membuka modal (Tambah, Ubah, atau Lihat Detail)
  const openModal = (mode: 'add' | 'edit' | 'view', menu?: Menu) => {
    setModalMode(mode)
    setActiveMenuId(null)
    if (menu) {
      setCurrentMenu(menu)
      setName(menu.name)
      setPrice(menu.price.toString())
      setCategory(menu.category || 'Makanan')
      setImageUrl(menu.image_url || '')
    } else {
      setCurrentMenu(null)
      setName('')
      setDescription('')
      setPrice('')
      setCategory('Makanan')
      setImageUrl('')
    }
    setShowModal(true)
  }

  // Fungsi untuk Menyimpan Data Produk ke Database Supabase
  async function handleSaveMenu(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !price) {
      alert('Nama Produk dan Harga wajib diisi!')
      return
    }

    try {
      const menuData = {
        name,
        price: parseFloat(price),
        category,
        image_url: imageUrl,
        is_available: true
      }

      if (modalMode === 'edit' && currentMenu !== null) {
        const { error } = await supabase.from('menus').update(menuData).eq('id', currentMenu.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('menus').insert([menuData])
        if (error) throw error
      }

      setShowModal(false)
      fetchMenus()
    } catch (error: any) {
      console.error('Error saving menu:', error)
      alert(`Gagal menyimpan produk: ${error.message || JSON.stringify(error)}`)
    }
  }

  // Fungsi untuk Menghapus Produk dari Database
  async function handleDeleteMenu(id: number) {
    setActiveMenuId(null)
    if (!confirm('Yakin ingin menghapus produk ini?')) return
    try {
      const { error } = await supabase.from('menus').delete().eq('id', id)
      if (error) throw error
      fetchMenus()
    } catch (error) {
      console.error('Error deleting menu:', error)
      alert('Gagal menghapus produk.')
    }
  }

  // Perhitungan Pagination untuk membatasi jumlah baris per halaman
  const totalPages = Math.ceil(filteredMenus.length / rowsPerPage) || 1
  const paginatedMenus = filteredMenus.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-800 p-6 space-y-6">
      
      {/* Header & Kotak Pencarian */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-96 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari produk..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-gray-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          {/* Tombol Tambah Produk */}
          <button
            onClick={() => openModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Tabel Daftar Produk */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <p className="text-center py-16 text-xs text-gray-400">Memuat produk...</p>
        ) : filteredMenus.length === 0 ? (
          <p className="text-center py-16 text-xs text-gray-400">Belum ada produk.</p>
        ) : (
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-4 px-5">Gambar</th>
                  <th className="py-4 px-5">Nama Produk</th>
                  <th className="py-4 px-5">Harga</th>
                  <th className="py-4 px-5">Kategori</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {paginatedMenus.map((menu) => (
                  <tr key={menu.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-5">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
                        {menu.image_url ? (
                          <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5 font-bold text-gray-900">{menu.name}</td>
                    <td className="py-3 px-5 font-extrabold text-gray-900">
                      Rp {Number(menu.price).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        menu.category === 'Dessert' ? 'bg-pink-50 text-pink-600' :
                        menu.category === 'Minuman' ? 'bg-blue-50 text-blue-600' :
                        menu.category === 'Snack' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {menu.category || 'Makanan'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right relative">
                      {/* Tombol Aksi Dropdown per Baris */}
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === menu.id ? null : menu.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Menu Dropdown */}
                      {activeMenuId === menu.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-gray-100 rounded-xl py-1.5 w-36 z-50 text-left">
                            <button 
                              onClick={() => openModal('view', menu)}
                              className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-400" /> Lihat
                            </button>
                            <button 
                              onClick={() => openModal('edit', menu)}
                              className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-gray-400" /> Ubah
                            </button>
                            <button 
                              onClick={() => handleDeleteMenu(menu.id)}
                              className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bagian Bawah Tabel: Kontrol Pagination */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <span>Manajemen data menu produk restoran</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Baris per halaman</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none text-xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <span>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex items-center gap-1">
              {/* Tombol ke halaman pertama */}
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                «
              </button>
              {/* Tombol ke halaman sebelumnya */}
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ‹
              </button>
              {/* Tombol ke halaman berikutnya */}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ›
              </button>
              {/* Tombol ke halaman terakhir */}
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form Tambah / Ubah Produk */}
      {showModal && modalMode !== 'view' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {modalMode === 'add' ? 'Tambah Produk Baru' : 'Ubah Produk'}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {modalMode === 'add' ? 'Masukkan detail menu makanan atau minuman baru' : 'Perbarui informasi produk'}
              </p>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Harga (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="25000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none"
                >
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Snack">Snack</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL Gambar Produk</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400 mb-2"
                />
                {imageUrl && (
                  <div className="h-28 w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                >
                  {modalMode === 'add' ? 'Simpan Produk' : 'Perbarui Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lihat Detail Produk */}
      {showModal && modalMode === 'view' && currentMenu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-bold text-gray-900 text-sm">Detail Produk</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Informasi lengkap untuk {currentMenu.name}</p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                {currentMenu.image_url ? (
                  <img src={currentMenu.image_url} alt={currentMenu.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{currentMenu.name}</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">ID Produk: #{currentMenu.id}</p>
                <div className="mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    currentMenu.category === 'Dessert' ? 'bg-pink-50 text-pink-600' :
                    currentMenu.category === 'Minuman' ? 'bg-blue-50 text-blue-600' :
                    currentMenu.category === 'Snack' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {currentMenu.category || 'Makanan'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Harga Satuan</p>
              <div className="flex justify-between items-center bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-xs">
                <span className="text-gray-500">Nominal</span>
                <span className="text-base font-black text-gray-900">
                  Rp {Number(currentMenu.price).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </main>
  )
}