'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { LogIn, Mail, Lock, Shield, ArrowLeft } from 'lucide-react'

export default function StaffLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tugas, setTugas] = useState('Kasir')
  const [loading, setLoading] = useState(false)

  // Proses autentikasi login staf dan pengalihan halaman sesuai tugas
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      alert('Mohon masukkan email dan password.')
      return
    }

    setLoading(true)
    try {
      // Cek ke tabel users di Supabase berdasarkan email, tugas, dan password
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('tugas', tugas)
        .eq('status', 'Active')
        .single()

      if (error || !data) {
        alert('Login gagal! Email, tugas, atau status akun tidak ditemukan / tidak aktif.')
        setLoading(false)
        return
      }

      // Verifikasi password
      if ((data.password || '').trim() !== password.trim()) {
        alert('Password salah!')
        setLoading(false)
        return
      }

      // Simpan sesi login staf di localStorage
      localStorage.setItem('staff_role', data.tugas)
      localStorage.setItem('staff_email', data.email)

      // Arahkan ke halaman sesuai tugas masing-masing
      if (data.tugas === 'Admin') {
        window.location.href = '/admin'
      } else if (data.tugas === 'Kasir') {
        window.location.href = '/kasir'
      } else if (data.tugas === 'Chef' || data.tugas === 'Chef') {
        window.location.href = '/dapur/kitchen'
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Login error:', err)
      alert('Terjadi kesalahan saat proses login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-gray-100">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        {/* Logo & Judul Login Staf */}
        <div className="text-center mb-8">
          {/* Gambar ikon logo blueMoon */}
          <img
            src="/ikon-blueMoon.png"
            alt="blueMoon Logo"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg"
          />
          <h1 className="text-2xl font-black text-white">Login Staf Restoran</h1>
          <p className="text-gray-400 text-xs mt-1">Akses khusus Admin, Kasir, dan Dapur blueMoon</p>
        </div>

        {/* Form Login Staf */}
        <form onSubmit={handleStaffLogin} className="space-y-4">
          {/* EMAIL / AKUN GMAIL */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email / Akun Gmail</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                required
                placeholder="nama@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-white"
              />
            </div>
          </div>

          {/* TUGAS / ROLE */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pilih Tugas</label>
            <div className="relative">
              <Shield className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <select
                value={tugas}
                onChange={(e) => setTugas(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-white appearance-none"
              >
                <option value="Admin">Admin</option>
                <option value="Kasir">Kasir</option>
                <option value="Chef">Chef</option>
              </select>
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-white"
              />
            </div>
          </div>

          {/* TOMBOL MASUK */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-4 h-4" /> {loading ? 'Memverifikasi...' : 'Masuk dengan Akun Staf'}
          </button>
        </form>

        {/* Link Kembali ke Halaman Pelanggan */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <a
            href="/customer-login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Menu Utama Pelanggan
          </a>
        </div>
      </div>
    </main>
  )
}