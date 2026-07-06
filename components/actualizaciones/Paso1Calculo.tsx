'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { calcularPVP, parsearArchivoIngenieria } from '@/lib/calculadora-precios'
import { formatCurrency, formatPercent, SEMAFORO_COLORS } from '@/lib/utils'
import type { ActualizacionState, ActualizacionItemUI } from '@/app/(app)/actualizaciones/nueva/page'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  state: ActualizacionState
  setState: React.Dispatch<React.SetStateAction<ActualizacionState>>
  onNext: () => void
}

export default function Paso1Calculo({ state, setState, onNext }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState(state.nombre)
  const [fechaVigencia, setFechaVigencia] = useState(state.fechaVigencia)
  const supabase = createClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      // Leer el archivo Excel con la API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nombre', nombre || `Actualización ${new Date().toLocaleDateString('es-UY')}`)
      formData.append('fechaVigencia', fechaVigencia || new Date().toISOString().split('T')[0])

      const response = await fetch('/api/actualizaciones/calcular', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Error procesando el archivo')
      }

      const data = await response.json()
      setState(prev => ({
        ...prev,
        actualizacionId: data.actualizacionId,
        nombre: data.nombre,
        fechaVigencia: data.fechaVigencia,
        items: data.items,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [nombre, fechaVigencia, setState])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  async function handleAprobarCalculo() {
    if (!state.actualizacionId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('gl_actualizaciones')
        .update({ estado: 'calculo_aprobado' })
        .eq('id', state.actualizacionId)

      if (error) throw error
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error aprobando el cálculo')
    } finally {
      setLoading(false)
    }
  }

  const totalItems = state.items.length
  const itemsRojos = state.items.filter(i => i.margen_pct < 0.2).length
  const avgDelta = state.items.length > 0
    ? state.items.reduce((sum, i) => sum + (i.delta_pvp_pct ?? 0), 0) / state.items.length
    : 0

  return (
    <div className="space-y-5">
      {/* Datos básicos */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Datos de la Actualización</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la actualización
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="ej: Actualización Junio 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de vigencia
            </label>
            <input
              type="date"
              value={fechaVigencia}
              onChange={e => setFechaVigencia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Upload zona */}
      {state.items.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            <FileSpreadsheet className="inline w-4 h-4 mr-2" />
            Archivo de Ingeniería de Precios
          </h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
              isDragActive
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Procesando archivo y calculando precios...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  {isDragActive ? 'Soltá el archivo acá' : 'Arrastrá el XLS o hacé click para seleccionar'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Formato esperado: cod_interno | descripcion | pcosto_nuevo
                </p>
              </>
            )}
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Resultados */}
      {state.items.length > 0 && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              <p className="text-sm text-gray-400 mt-1">items calculados</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">+{formatPercent(avgDelta)}</p>
              <p className="text-sm text-gray-400 mt-1">aumento promedio PVP</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${itemsRojos > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-2xl font-bold ${itemsRojos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {itemsRojos}
              </p>
              <p className="text-sm text-gray-400 mt-1">ítems con margen bajo</p>
            </div>
          </div>

          {/* Tabla de resultados */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Detalle de Cálculos</h2>
              <button
                onClick={() => setState(prev => ({ ...prev, items: [] }))}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Reemplazar archivo
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase">Descripción</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase">Cadena</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">P.Costo ant.</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">P.Costo nuevo</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">Δ costo</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">PVP ant.</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">PVP nuevo</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">Δ PVP</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">Margen</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase">Fracc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.items.map((item, i) => {
                    const semaforo = item.margen_pct >= 0.3 ? 'verde'
                      : item.margen_pct >= 0.25 ? 'amarillo' : 'rojo'
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">{item.cod_interno}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 max-w-48 truncate">{item.descripcion}</td>
                        <td className="px-3 py-2 text-gray-500">{item.cadena_nombre}</td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {item.pcosto_anterior ? formatCurrency(item.pcosto_anterior) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.pcosto_nuevo)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${item.delta_costo_pct && item.delta_costo_pct > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {item.delta_costo_pct ? `+${formatPercent(item.delta_costo_pct)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {item.pvp_anterior ? formatCurrency(item.pvp_anterior) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          {formatCurrency(item.pvp_redondeado)}
                        </td>
                        <td className={`px-3 py-2 text-right font-medium ${item.delta_pvp_pct && item.delta_pvp_pct > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                          {item.delta_pvp_pct ? `+${formatPercent(item.delta_pvp_pct)}` : '—'}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${SEMAFORO_COLORS[semaforo].split(' ')[0]}`}>
                          {formatPercent(item.margen_pct)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {formatCurrency(item.fraccion_empresa)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botón aprobar */}
          <div className="flex justify-end">
            <button
              onClick={handleAprobarCalculo}
              disabled={loading}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Aprobando...' : 'Aprobar Cálculo y Continuar →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
