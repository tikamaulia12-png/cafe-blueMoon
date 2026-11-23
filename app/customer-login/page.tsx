'use client'

import { useState } from 'react'
import { LogIn, Mail } from 'lucide-react'

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Validasi dan proses masuk pelanggan ke katalog menu
  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      alert('Masukkan alamat email yang valid.')
      return
    }

    setLoading(true)
    // Simpan email pelanggan ke localStorage agar bisa disapa atau dikenali
    localStorage.setItem('customer_email', email)

    setTimeout(() => {
      setLoading(false)
      // Langsung arahkan ke halaman utama katalog menu
      window.location.href = '/'
    }, 800)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-800">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-md w-full shadow-xl">
        {/* Logo & Sambutan blueMoon Cafe */}
        <div className="text-center mb-8">
          {/* Gambar ikon logo blueMoon */}
          <img
            src="/ikon-blueMoon.png"
            alt="blueMoon Logo"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-md"
          />
          <h2 className="text-2xl font-black text-gray-900">Welcome to blueMoon Cafe</h2>
          <p className="text-gray-400 text-xs mt-1">Masukkan email Anda untuk mulai memesan makanan</p>
        </div>

        {/* Form Input Email Pelanggan */}
        <form onSubmit={handleCustomerLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email / Akun Gmail</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                placeholder="namaemail@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-md flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> {loading ? 'Masuk...' : 'Masuk ke Menu Cafe'}
          </button>
        </form>

        {/* Link Masuk Khusus Staf Cafe */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Anda adalah staf cafe?{' '}
            <a href="/login" className="text-blue-600 font-bold hover:underline">
              Login Staf di sini
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}