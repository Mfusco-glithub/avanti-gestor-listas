'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { ActualizacionState } from '@/app/(app)/actualizaciones/nueva/page'
import { FileDown, RefreshCw, CheckCircle2, ChevronLeft } from 'lucide-react'

interface Props {
  state: ActualizacionState
  setState: React.Dispatch<React.SetStateAction<ActualizacionState>>
  onNext: () => void
  onBack: () => void
}

export default function Paso2Listas({ state, setState, onNext, onBack }: Props) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Agrupar items por cadena
  const cadenasConItems = Object.entries(
    state.items.reduce<Record<string, typeof state.items>>((acc, item) => {
      if (!acc[item.cadena_id]) acc[item.cadena_id] = []
      acc[item.cadena_id].push(item)
      return acc
    }, {})
  ).map(([cadenaId, items]) => ({
    cadenaId,
    cadenaNombre: items[0].cadena_nombre,
    items,
    seleccionada: state.cadenasSeleccionadas.includes(cadenaId),
  }))

  function toggleCadena(cadenaId: string) {
    setState(prev => ({
      ...prev,
      cadenasSeleccionadas: prev.cadenasSeleccionadas.includes(cadenaId)
        ? prev.cadenasSeleccionadas.filter(id => id !== cadenaId)
        : [...prev.cadenasSeleccionadas, cadenaId],
    }))
  }

  async function generarArchivo(cadenaId: string) {
    if (!state.actualizacionId) return
    setGenerating(cadenaId)
    try {
      const response = await fetch('/api/archivos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualizacionId: state.actualizacionId,
          cadenaId,
        }),
      })
      if (!response.ok) throw new Error('Error generando archivo')

      // Descargar el archivo directamente
      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const fileName = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'lista-precios.xlsx'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName ?? 'lista-precios.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(null)
    }
  }

  async function handleAprobarListas() {
    if (!state.actualizacionId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('gl_actualizaciones')
        .update({ estado: 'listas_aprobadas' })
        .eq('id', state.actualizacionId)
      if (error) throw error
      onNext()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Listas de Precios por Cadena</h2>
        <p className="text-sm text-gray-400">Seleccioná las cadenas a incluir y descargá o previsualiza cada lista</p>
      </div>

      <div className="space-y-3">
        {cadenasConItems.length > 0 ? (
          cadenasConItems.map(({ cadenaId, cadenaNombre, items, seleccionada }) => (
            <div
              key={cadenaId}
              className={`bg-white rounded-xl border-2 p-5 transition ${
                seleccionada ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    onChange={() => toggleCadena(cadenaId)}
                    className="w-4 h-4 accent-red-600"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{cadenaNombre}</p>
                    <p className="text-sm text-gray-400">{items.length} SKUs · Avg PVP {formatCurrency(items.reduce((s, i) => s + i.pvp_redondeado, 0) / items.length)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generarArchivo(cadenaId)}
                    disabled={generating === cadenaId}
                    className="flex items-center gap-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {generating === cadenaId ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    Descargar Lista
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No hay cadenas con ítems calculados</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm transition"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <button
          onClick={handleAprobarListas}
          disabled={loading || state.cadenasSeleccionadas.length === 0}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <CheckCircle2 className="w-4 h-4" />
          {loading ? 'Aprobando...' : 'Aprobar Listas →'}
        </button>
      </div>
    </div>
  )
}
