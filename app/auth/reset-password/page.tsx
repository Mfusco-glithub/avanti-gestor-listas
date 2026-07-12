'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Fase = 'verificando' | 'listo' | 'guardando' | 'ok' | 'error'
const MIN_PASS = 8

/**
 * Reset de contraseña.
 *
 * Consume el link de recovery de Supabase, que llega con los tokens en el hash:
 *   /auth/reset-password#access_token=...&refresh_token=...&type=recovery
 * Establece la sesión con setSession() (mismo enfoque que auth/callback, el hash
 * nunca viaja al server) y muestra un formulario para setear la contraseña nueva.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fase, setFase] = useState<Fase>('verificando')
  const [error, setError] = useState<string | null>(null)
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')

  // 1) Al montar: establecer sesión desde el hash (mismo enfoque que auth/callback)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))

    // Link vencido/ya usado: Supabase redirige con estos params, sin tokens
    if (hash.get('error') || hash.get('error_code')) {
      setError('El link de recuperación expiró o ya fue usado. Pedí uno nuevo.')
      setFase('error')
      return
    }

    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setError('No pudimos validar el link. Puede haber expirado; pedí uno nuevo.')
          setFase('error')
          return
        }
        window.history.replaceState(null, '', '/auth/reset-password') // limpia el hash
        setFase('listo')
      })
      return
    }

    // Sin tokens en el hash: quizá detectSessionInUrl ya los consumió → chequear sesión
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setFase('listo')
      else {
        setError('El link es inválido o expiró. Pedí uno nuevo desde el login.')
        setFase('error')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) Guardar la nueva contraseña
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (pass.length < MIN_PASS) {
      setError(`La contraseña debe tener al menos ${MIN_PASS} caracteres.`)
      return
    }
    if (pass !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setFase('guardando')
    const { error } = await supabase.auth.updateUser({ password: pass })

    if (error) {
      const m = error.message
      setError(
        /different from the old password/i.test(m)
          ? 'La nueva contraseña debe ser distinta a la anterior.'
          : /weak|at least|characters/i.test(m)
          ? 'La contraseña es demasiado débil o corta. Probá una más larga.'
          : /session missing|not authenticated/i.test(m)
          ? 'La sesión de recuperación expiró. Pedí un link nuevo.'
          : 'No pudimos actualizar la contraseña. Intentá de nuevo.'
      )
      setFase('listo')
      return
    }

    // Cerrar TODAS las sesiones (invalida refresh tokens en otros dispositivos)
    // y mandar a login para reingresar con la contraseña nueva.
    await supabase.auth.signOut({ scope: 'global' })
    setFase('ok')
    setTimeout(() => {
      router.replace('/login')
      router.refresh()
    }, 1800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
            <p className="text-gray-500 text-sm mt-1">Gestor de Listas de Precios</p>
          </div>

          {fase === 'verificando' && (
            <p className="text-center text-gray-500 text-sm">Validando el link…</p>
          )}

          {fase === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
              <button
                onClick={() => router.replace('/login')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm"
              >
                Volver al login
              </button>
            </div>
          )}

          {fase === 'ok' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Contraseña actualizada. Iniciá sesión con tu nueva contraseña…
            </div>
          )}

          {(fase === 'listo' || fase === 'guardando') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  id="pass"
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  required
                  minLength={MIN_PASS}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={MIN_PASS}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={fase === 'guardando'}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm"
              >
                {fase === 'guardando' ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
