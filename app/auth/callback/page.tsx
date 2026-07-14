'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  // Capturar el hash SINCRÓNICAMENTE en el primer render del cliente, antes de
  // cualquier efecto — así nada puede consumirlo/limpiarlo entre medio.
  const hashRef = useRef<string>(typeof window !== 'undefined' ? window.location.hash : '')

  useEffect(() => {
    const hash = hashRef.current
    console.log('[CB] 1. montado → hash_len=', hash.length)
    const params = new URLSearchParams(hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    console.log('[CB] 2. tokens → has_access=', !!access_token, 'has_refresh=', !!refresh_token)

    const supabase = createClient()

    function entrar() {
      console.log('[CB] 4. redirect → navegación completa a /dashboard')
      // Navegación completa del navegador (NO el client router del App Router, que
      // colgaba tras el replaceState manual). Determinística. location.replace (no
      // .assign) → /auth/callback#tokens no queda en el historial del popup, así los
      // tokens no son recuperables con el botón Atrás.
      window.location.replace('/dashboard')
    }

    async function run() {
      try {
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          console.log('[CB] 3. setSession →', error ? 'ERROR: ' + error.message : 'OK')
          if (error) {
            setError('No se pudo iniciar sesión: ' + error.message)
            return
          }
          entrar()
          return
        }
        // Hash vacío (recarga con la URL ya limpia): si ya hay sesión, entrar.
        const { data } = await supabase.auth.getSession()
        console.log('[CB] 3. getSession (sin hash) →', data.session ? 'hay sesión' : 'sin sesión')
        if (data.session) entrar()
        else setError('Faltan tokens de sesión en la URL')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.log('[CB] 3. EXCEPTION →', msg)
        setError('No se pudo iniciar sesión: ' + msg)
      }
    }
    run()
  }, [])

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
