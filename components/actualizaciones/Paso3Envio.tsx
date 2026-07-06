'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActualizacionState } from '@/app/(app)/actualizaciones/nueva/page'
import { Send, CheckCircle, XCircle, Loader2, ChevronLeft } from 'lucide-react'

interface Props {
  state: ActualizacionState
  onBack: () => void
}

type EstadoEnvio = 'pendiente' | 'enviando' | 'enviado' | 'error'

export default function Paso3Envio({ state, onBack }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [estados, setEstados] = useState<Record<string, EstadoEnvio>>({})

  const cadenasSeleccionadas = [
    ...new Set(state.items.filter(i => state.cadenasSeleccionadas.includes(i.cadena_id)).map(i => i.cadena_id))
  ].map(id => ({
    id,
    nombre: state.items.find(i => i.cadena_id === id)?.cadena_nombre ?? id,
  }))

  async function enviarCadena(cadenaId: string) {
    setEstados(prev => ({ ...prev, [cadenaId]: 'enviando' }))
    try {
      const response = await fetch('/api/email/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualizacionId: state.actualizacionId,
          cadenaId,
        }),
      })
      if (!response.ok) throw new Error('Error al enviar')
      setEstados(prev => ({ ...prev, [cadenaId]: 'enviado' }))
    } catch {
      setEstados(prev => ({ ...prev, [cadenaId]: 'error' }))
    }
  }

  async function enviarTodo() {
    setEnviando(true)
    for (const cadena of cadenasSeleccionadas) {
      await enviarCadena(cadena.id)
    }
    setEnviando(false)
  }

  const allSent = cadenasSeleccionadas.every(c => estados[c.id] === 'enviado')

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Envío de Listas a Cadenas</h2>
        <p className="text-sm text-gray-400">
          Se enviará la lista de precios actualizada al contacto configurado por cada cadena
        </p>
      </div>

      <div className="space-y-3">
        {cadenasSeleccionadas.map(cadena => (
          <div key={cadena.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {estados[cadena.id] === 'enviado' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : estados[cadena.id] === 'error' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : estados[cadena.id] === 'enviando' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{cadena.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {estados[cadena.id] === 'enviado' ? 'Enviado correctamente' :
                     estados[cadena.id] === 'error' ? 'Error al enviar — intentar nuevamente' :
                     estados[cadena.id] === 'enviando' ? 'Enviando...' :
                     'Pendiente de envío'}
                  </p>
                </div>
              </div>
              {estados[cadena.id] !== 'enviado' && (
                <button
                  onClick={() => enviarCadena(cadena.id)}
                  disabled={estados[cadena.id] === 'enviando'}
                  className="flex items-center gap-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm transition"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        {!allSent ? (
          <button
            onClick={enviarTodo}
            disabled={enviando}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition"
          >
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando...' : 'Enviar Todo'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle className="w-5 h-5" />
            Todas las listas enviadas
          </div>
        )}
      </div>
    </div>
  )
}
