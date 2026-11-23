'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Search, Filter, Plus, MoreVertical, X, Trash2, Edit, Key, UserCheck, Shield } from 'lucide-react'

type UserProfile = {
  id: number
  first_name: string
  last_name: string
  email: string
  no_telp: string
  tugas: string
  status: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // State untuk pengaturan halaman (Pagination)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // State untuk modal dan aksi per user
  const [modalType, setModalType] = useState<'none' | 'add' | 'edit' | 'tugas' | 'password' | 'status'>('none')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  // State untuk form input data user
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [noTelp, setNoTelp] = useState('')
  const [password, setPassword] = useState('')
  const [tugas, setTugas] = useState('Chef')
  const [status, setStatus] = useState('Active')

  // Mengambil data saat komponen pertama kali dirender
  useEffect(() => {
    fetchUsers()
  }, [])

  // Memfilter data user berdasarkan nama atau email
  useEffect(() => {
    const results = users.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredUsers(results)
    setCurrentPage(1)
  }, [searchQuery, users])

  // Mengambil data users dari database Supabase
  async function fetchUsers() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('users').select('*').order('id', { ascending: false })
      if (error) throw error
      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Menambah user baru ke database
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('users').insert([
      { first_name: firstName, last_name: lastName, email, no_telp: noTelp, password, tugas, status }
    ])
    if (error) {
      alert('Gagal menambah user')
    } else {
      setModalType('none')
      resetForm()
      fetchUsers()
    }
  }

  // Memperbarui info dasar user (nama dan nomor telepon)
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    const { error } = await supabase.from('users').update({
      first_name: firstName,
      last_name: lastName,
      no_telp: noTelp
    }).eq('id', selectedUser.id)

    if (error) alert('Gagal memperbarui user')
    else { setModalType('none'); fetchUsers(); }
  }

  // Mengubah tugas/peran user
  async function handleChangeTugas(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    const { error } = await supabase.from('users').update({ tugas }).eq('id', selectedUser.id)
    if (error) alert('Gagal mengubah tugas')
    else { setModalType('none'); fetchUsers(); }
  }

  // Mereset password user
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    const { error } = await supabase.from('users').update({ password }).eq('id', selectedUser.id)
    if (error) alert('Gagal mereset password')
    else { alert('Password berhasil direset!'); setModalType('none'); }
  }

  // Mengubah status user (Active / Inactive)
  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    const { error } = await supabase.from('users').update({ status }).eq('id', selectedUser.id)
    if (error) alert('Gagal mengubah status')
    else { setModalType('none'); fetchUsers(); }
  }

  // Menghapus user dari database
  async function handleDelete(id: number) {
    if (!confirm('Yakin ingin menghapus user ini?')) return
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) alert('Gagal menghapus')
    else fetchUsers()
  }

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setNoTelp('')
    setPassword('')
    setTugas('Chef')
    setStatus('Active')
  }

  // Perhitungan pagination untuk membatasi jumlah baris per halaman
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-800 p-6 space-y-6">
      
      {/* Header & Kotak Pencarian */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-96 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-gray-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          {/* Tombol Tambah User */}
          <button 
            onClick={() => { resetForm(); setModalType('add'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Tabel Daftar Users */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <p className="text-center py-12 text-xs text-gray-400">Memuat data users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-12 text-xs text-gray-400">Tidak ada user ditemukan.</p>
        ) : (
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-4 px-5">First Name</th>
                  <th className="py-4 px-5">Last Name</th>
                  <th className="py-4 px-5">Email</th>
                  <th className="py-4 px-5">No Telp</th>
                  <th className="py-4 px-5">Tugas</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-5 font-bold text-gray-900">{user.first_name}</td>
                    <td className="py-3.5 px-5 text-gray-600">{user.last_name}</td>
                    <td className="py-3.5 px-5 text-gray-500">{user.email}</td>
                    <td className="py-3.5 px-5 text-gray-500">{user.no_telp}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        user.tugas === 'Admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        user.tugas === 'Kasir' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        user.tugas === 'Chef' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.tugas}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        user.status === 'Inactive' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Inactive' ? 'bg-red-500' : 'bg-green-500'}`} />
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right relative">
                      {/* Tombol Aksi Dropdown per Baris */}
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Menu Dropdown */}
                      {activeMenuId === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-gray-100 rounded-xl py-1.5 w-44 z-50 text-left">
                            <button 
                              onClick={() => { setSelectedUser(user); setFirstName(user.first_name); setLastName(user.last_name); setNoTelp(user.no_telp || ''); setModalType('edit'); setActiveMenuId(null); }}
                              className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="w-3.5 h-3.5 text-gray-400" /> Edit
                            </button>
                            <button 
                              onClick={() => { setSelectedUser(user); setTugas(user.tugas); setModalType('tugas'); setActiveMenuId(null); }}
                              className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Shield className="w-3.5 h-3.5 text-gray-400" /> Change Tugas
                            </button>
                            <button 
                              onClick={() => { setSelectedUser(user); setModalType('password'); setActiveMenuId(null); }}
                              className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Key className="w-3.5 h-3.5 text-gray-400" /> Reset Password
                            </button>
                            <button 
                              onClick={() => { setSelectedUser(user); setStatus(user.status === 'Active' ? 'Inactive' : 'Active'); setModalType('status'); setActiveMenuId(null); }}
                              className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-gray-400" /> {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              onClick={() => { handleDelete(user.id); setActiveMenuId(null); }}
                              className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
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
          <span>0 of {filteredUsers.length} row(s) selected.</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
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

      {/* Modal Tambah User */}
      {modalType === 'add' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Add User</h3>
              <p className="text-[11px] text-gray-400">Isi detail di bawah ini untuk menambahkan pengguna baru.</p>
            </div>
            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">First Name</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Masukkan nama pertama" className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Last Name</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Masukkan nama terakhir" className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">No Telp</label>
                <input type="text" value={noTelp} onChange={e => setNoTelp(e.target.value)} placeholder="+62 812 3456 7890" className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tugas</label>
                  <select value={tugas} onChange={e => setTugas(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none">
                    <option value="Chef">Chef</option>
                    <option value="Kasir">Kasir</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit User */}
      {modalType === 'edit' && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Edit User</h3>
              <p className="text-[11px] text-gray-400">Perbarui informasi pengguna di bawah ini.</p>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Email</label>
                <input type="email" disabled value={selectedUser.email} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">No Telp</label>
                <input type="text" value={noTelp} onChange={e => setNoTelp(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800">Update User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Tugas */}
      {modalType === 'tugas' && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Change Tugas</h3>
              <p className="text-[11px] text-gray-400">Ubah tugas dari {selectedUser.first_name} {selectedUser.last_name}. Tugas saat ini: <span className="font-bold">{selectedUser.tugas}</span></p>
            </div>
            <form onSubmit={handleChangeTugas} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tugas</label>
                <select value={tugas} onChange={e => setTugas(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none">
                  <option value="Admin">Admin</option>
                  <option value="Kasir">Kasir</option>
                  <option value="Chef">Chef</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800">Change Tugas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {modalType === 'password' && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Reset Password</h3>
              <p className="text-[11px] text-gray-400">Atur ulang password untuk {selectedUser.first_name} {selectedUser.last_name}.</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Password Baru</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password baru" className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Status */}
      {modalType === 'status' && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setModalType('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Update User Status</h3>
              <p className="text-[11px] text-gray-400">Ubah status untuk {selectedUser.first_name} {selectedUser.last_name}.</p>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}