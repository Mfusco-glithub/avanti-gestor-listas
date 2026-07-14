'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Auto-login callback.
 *
 * Recibe los tokens de Supabase en el hash de la URL:
 *   /auth/callback#access_token=...&refresh_token=...
 * y los persiste como sesión SSR (cookies) llamando a setSession() en el
 * origin de esta app. Usado por el auto-login desde el dashboard de gerencia.
 *
 * El hash nunca viaja al servidor, así que este paso client-side es la única
 * forma de establecer la cookie de sesión desde un origin externo.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    const supabase = createClient()

    function entrar() {
      // Limpiar los tokens de la URL antes de navegar (no quedan en el historial)
      window.history.replaceState(null, '', '/auth/callback')
      router.replace('/dashboard')
      router.refresh()
    }

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setError(error.message)
          return
        }
        entrar()
      })
      return
    }

    // Hash vacío (p.ej. recarga con la URL ya limpia): si ya hay sesión, entrar;
    // si no, error legible.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) entrar()
      else setError('Faltan tokens de sesión en la URL')
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Error de autenticación: {error}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Iniciando sesión…</div>
      )}
    </div>
  )
}
