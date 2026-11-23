'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Search, Filter, Plus, MoreVertical, X, Trash2, Eye, RefreshCw } from 'lucide-react'

// Tipe data item inventory sesuai struktur kolom tabel 'menus'
type InventoryItem = {
  id: number
  name: string
  sku: string
  category: string
  stock: number
  reorder_level: number
  last_restocked: string
  image_url: string
  price: number
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  // State untuk pengaturan halaman (Pagination)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // State untuk modal dan aksi restock/detail
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [modalType, setModalType] = useState<'none' | 'restock' | 'details' | 'add'>('none')
  const [restockQty, setRestockQty] = useState(0)

  // State untuk form tambah item baru
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newCategory, setNewCategory] = useState('Makanan')
  const [newStock, setNewStock] = useState(10)
  const [newPrice, setNewPrice] = useState(20000)
  const [newImage, setNewImage] = useState('')

  // State ID menu dropdown yang sedang terbuka per baris
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  // Mengambil data inventory saat komponen pertama kali dimuat
  useEffect(() => {
    fetchInventory()
  }, [])

  // Memfilter item berdasarkan pencarian nama/SKU dan kategori yang dipilih
  useEffect(() => {
    let results = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (selectedCategoryFilter !== 'All') {
      results = results.filter(item => item.category === selectedCategoryFilter)
    }

    setFilteredItems(results)
    setCurrentPage(1)
  }, [searchQuery, selectedCategoryFilter, items])

  // Mengambil seluruh data produk/stok dari tabel 'menus' di Supabase
  async function fetchInventory() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error
      setItems(data || [])
      setFilteredItems(data || [])
    } catch (err) {
      console.error('Error fetching inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  // Menambah jumlah stok item dan memperbarui tanggal terakhir restock
  async function handleRestockSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return

    const updatedStock = Number(selectedItem.stock || 0) + Number(restockQty)
    const todayStr = new Date().toISOString()

    const { error } = await supabase
      .from('menus')
      .update({ stock: updatedStock, last_restocked: todayStr })
      .eq('id', selectedItem.id)

    if (error) {
      alert('Gagal memperbarui stok')
    } else {
      setModalType('none')
      setRestockQty(0)
      fetchInventory()
    }
  }

  // Menghapus item dari database
  async function handleDelete(id: number) {
    if (!confirm('Yakin ingin menghapus item ini dari inventory?')) return
    const { error } = await supabase.from('menus').delete().eq('id', id)
    if (error) {
      alert('Gagal menghapus item')
    } else {
      fetchInventory()
    }
  }

  // Menambahkan item baru ke database (dengan SKU dan gambar default jika dikosongkan)
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('menus').insert([
      {
        name: newName,
        sku: newSku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
        category: newCategory,
        stock: Number(newStock),
        price: Number(newPrice),
        image_url: newImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100',
        last_restocked: new Date().toISOString(),
        is_available: true
      }
    ])

    if (error) {
      alert('Gagal menambah item baru')
    } else {
      setModalType('none')
      setNewName('')
      setNewSku('')
      fetchInventory()
    }
  }

  // Mengatur warna badge sesuai kategori produk
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Dessert': return 'bg-pink-50 text-pink-600'
      case 'Minuman': return 'bg-blue-50 text-blue-600'
      case 'Snack': return 'bg-amber-50 text-amber-600'
      default: return 'bg-green-50 text-green-600' // Makanan
    }
  }

  // Perhitungan pagination untuk membatasi jumlah baris per halaman
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage) || 1
  const paginatedItems = filteredItems.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-800 p-6 space-y-6">
      
      {/* Header, Kotak Pencarian, Filter Kategori & Tombol Add Item */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-96 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-gray-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end relative">
          {/* Dropdown filter berdasarkan kategori */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              <Filter className="w-3.5 h-3.5" /> Filter: {selectedCategoryFilter}
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-40 z-30 text-xs">
                {['All', 'Makanan', 'Minuman', 'Snack', 'Dessert'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategoryFilter(cat); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${selectedCategoryFilter === cat ? 'text-gray-900 font-bold bg-gray-50' : 'text-gray-600'}`}
                  >
                    {cat === 'All' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setModalType('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Tabel Daftar Inventory */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <p className="text-center py-12 text-xs text-gray-400">Memuat data inventory...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center py-12 text-xs text-gray-400">Tidak ada produk ditemukan.</p>
        ) : (
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-4 px-5">Gambar</th>
                  <th className="py-4 px-5">Nama Product</th>
                  <th className="py-4 px-5">SKU</th>
                  <th className="py-4 px-5">Kategori</th>
                  <th className="py-4 px-5">Jumlah Stok</th>
                  <th className="py-4 px-5">Batas Restock</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Terakhir Restock</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {paginatedItems.map((item) => {
                  // Mengecek apakah stok sudah menyentuh atau di bawah batas restock
                  const isLowStock = Number(item.stock || 0) <= (item.reorder_level || 10)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-5">
                        {/* Menampilkan gambar produk atau gambar fallback */}
                        <img 
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'} 
                          alt={item.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-gray-100" 
                        />
                      </td>
                      <td className="py-3 px-5 font-bold text-gray-900">{item.name}</td>
                      <td className="py-3 px-5 text-gray-500 font-mono">{item.sku || `SKU-${item.id}`}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getCategoryBadgeClass(item.category)}`}>
                          {item.category || 'Makanan'}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-bold text-gray-900">{item.stock ?? 0}</td>
                      <td className="py-3 px-5 text-gray-500">{item.reorder_level ?? 10}</td>
                      {/* Badge status stok: Low Stock (merah) atau In Stock (hijau) */}
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} />
                          {isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-400">
                        {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Mar 22, 2026'}
                      </td>
                      <td className="py-3 px-5 text-right relative">
                        {/* Tombol Aksi Dropdown per Baris */}
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Menu Dropdown */}
                        {activeMenuId === item.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-gray-100 rounded-xl py-1.5 w-36 z-50 text-left">
                              <button 
                                onClick={() => { setSelectedItem(item); setModalType('restock'); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-gray-400" /> Restock
                              </button>
                              <button 
                                onClick={() => { setSelectedItem(item); setModalType('details'); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-400" /> View Details
                              </button>
                              <button 
                                onClick={() => { handleDelete(item.id); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bagian Bawah Tabel: Kontrol Pagination */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <span>0 of {filteredItems.length} row(s) selected.</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); }}
                className="border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none text-xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                «
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ‹
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ›
              </button>
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

      {/* Modal Tambah Stok (Restock Item) */}
      {modalType === 'restock' && selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Restock Item</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Tambah stock untuk {selectedItem.name}</p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Stok saat ini:</span>
                <span className="font-bold text-gray-900">{selectedItem.stock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pemesanan ulang:</span>
                <span className="font-bold text-gray-900">{selectedItem.reorder_level || 10}</span>
              </div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Tambahkan Jumlah</label>
                <input 
                  type="number" 
                  min="1" 
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  placeholder="Enter quantity to add" 
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-gray-900"
                />
              </div>

              {/* Pratinjau total stok setelah ditambah */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl text-xs">
                <span className="font-semibold text-gray-600">Total baru:</span>
                <span className="font-bold text-gray-900 text-sm">{Number(selectedItem.stock || 0) + Number(restockQty)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800">Restock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lihat Detail Item & Level Stok */}
      {modalType === 'details' && selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Item Details</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Informasi lengkap untuk {selectedItem.name}</p>
            </div>

            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <img src={selectedItem.image_url} alt={selectedItem.name} className="w-16 h-16 rounded-xl object-cover" />
              <div>
                <h4 className="font-bold text-base text-gray-900">{selectedItem.name}</h4>
                <p className="text-xs font-mono text-gray-400">{selectedItem.sku}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getCategoryBadgeClass(selectedItem.category)}`}>
                    {selectedItem.category || 'Makanan'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    Number(selectedItem.stock || 0) <= (selectedItem.reorder_level || 10) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {Number(selectedItem.stock || 0) <= (selectedItem.reorder_level || 10) ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi stok</h5>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Jumlah saat ini</span>
                  <span className="text-xl font-black text-gray-900">{selectedItem.stock}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]"> Pemesanan ulang</span>
                  <span className="text-xl font-black text-gray-900">{selectedItem.reorder_level || 10}</span>
                </div>
              </div>
              {/* Progress bar persentase level stok */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
                  <span>Stock Level</span>
                  <span className="text-green-600">{Math.min(Math.round((Number(selectedItem.stock) / (selectedItem.reorder_level || 10)) * 100), 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min((Number(selectedItem.stock) / Math.max(selectedItem.reorder_level || 10, 20)) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
              <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Informasi Tambahan</h5>
              <div className="flex justify-between text-gray-600">
                <span>Terakhir Restock: {selectedItem.last_restocked ? new Date(selectedItem.last_restocked).toLocaleDateString() : 'Mar 22, 2026'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Item Baru */}
      {modalType === 'add' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-gray-900 text-sm">Tambahkan product baru</h3>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Product</label>
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama menu..." className="w-full px-3 py-2 border rounded-xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategori</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl outline-none bg-white">
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 units mb-1">Stock Awal</label>
                  <input type="number" required value={newStock} onChange={e => setNewStock(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Harga (Rp)</label>
                  <input type="number" required value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">SKU (Opsional)</label>
                  <input type="text" value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="SKU-XXXX" className="w-full px-3 py-2 border rounded-xl outline-none" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Gambar URL (JPEG/PNG)</label>
                <input type="text" value={newImage} onChange={e => setNewImage(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border rounded-xl outline-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 font-semibold text-gray-600">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}