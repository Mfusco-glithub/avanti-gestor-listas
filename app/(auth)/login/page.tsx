'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const RESET_COOLDOWN = 60

  // Si un link de recovery cae acá (Site URL = login), reenviarlo a la página de reset
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery') && hash.includes('access_token')) {
      router.replace('/auth/reset-password' + hash)
    }
  }, [router])

  // Cuenta regresiva del cooldown del botón de recovery
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleReset() {
    if (!email) {
      setError('Ingresá tu email primero.')
      return
    }
    setResetting(true)
    setError(null)
    setInfo(null)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetting(false)
    // Respuesta genérica: no revelamos si el email existe o no (anti-enumeración)
    setInfo('Si el email está registrado, te enviamos un link para restablecer la contraseña. Revisá tu bandeja.')
    setCooldown(RESET_COOLDOWN)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message
      )
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Avanti Uruguay</h1>
          <p className="text-gray-500 text-sm mt-1">Gestor de Listas de Precios</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              placeholder="usuario@avanti.com.uy"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || cooldown > 0}
            className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition disabled:opacity-50 disabled:hover:text-gray-500"
          >
            {resetting
              ? 'Enviando…'
              : cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : '¿Olvidaste tu contraseña?'}
          </button>
        </form>
      </div>
    </div>
  )
}
