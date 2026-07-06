'use client'
import { useEffect, useState, useCallback } from 'react'
import { Building2, Plus, Trash2, Save, CheckCircle, AlertCircle, Loader2, ChevronDown, Percent } from 'lucide-react'

interface Descuento {
  id: string
  cadena: string
  familia: string | null
  descuento_pct: number
  vigencia_desde: string
  notas: string | null
}

const FAMILIA_LABELS: Record<string, { color: string }> = {
  'Masas': { color: 'bg-blue-100 text-blue-800 border-blue-300' },
  'Empanadas Congeladas': { color: 'bg-orange-100 text-orange-800 border-orange-300' },
  'Pizzas Congeladas': { color: 'bg-red-100 text-red-800 border-red-300' },
  'Pastas Congeladas': { color: 'bg-purple-100 text-purple-800 border-purple-300' },
  'Pastas Frescas ATM': { color: 'bg-green-100 text-green-800 border-green-300' },
  'Pastas Frescas': { color: 'bg-teal-100 text-teal-800 border-teal-300' },
  'Salsas': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
}

const CADENA_FLAGS: Record<string, string> = {
  MACRO: '🔵',
  TATA: '🟢',
  TIENDA: '🟡',
  DISCO: '🔴',
  DEVOTO: '🔴',
  GEANT: '🔴',
}

export default function CadenasPage() {
  const [cadenas, setCadenas] = useState<string[]>([])
  const [familias, setFamilias] = useState<string[]>([])
  const [descuentos, setDescuentos] = useState<Descuento[]>([])
  const [cadenaActiva, setCadenaActiva] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [nuevaFamilia, setNuevaFamilia] = useState('')
  const [nuevoPct, setNuevoPct] = useState('')
  const [showForm, setShowForm] = useState(false)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/configuracion/cadenas')
      const d = await r.json()
      setCadenas(d.cadenas ?? [])
      setFamilias(d.familias ?? [])
      setDescuentos(d.descuentos ?? [])
      if (!cadenaActiva && d.cadenas?.length > 0) setCadenaActiva(d.cadenas[0])
    } finally {
      setLoading(false)
    }
  }, [cadenaActiva])

  useEffect(() => { cargar() }, [])

  const descuentosCadena = descuentos.filter(d => d.cadena === cadenaActiva)
  const familiasConRegla = new Set(descuentosCadena.map(d => d.familia ?? '__todas__'))
  const familiasDisponibles = familias.filter(f => !familiasConRegla.has(f))

  async function guardarNuevo() {
    if (!nuevoPct || parseFloat(nuevoPct) <= 0 || parseFloat(nuevoPct) >= 100) {
      showToast('error', 'Ingresá un porcentaje entre 1 y 99')
      return
    }
    setSaving('nuevo')
    try {
      const res = await fetch('/api/configuracion/cadenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          cadena: cadenaActiva,
          familia: nuevaFamilia || null,
          descuento_pct: parseFloat(nuevoPct),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      showToast('success', 'Descuento guardado')
      setShowForm(false)
      setNuevaFamilia('')
      setNuevoPct('')
      await cargar()
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(null)
    }
  }

  async function eliminar(id: string) {
    setSaving(id)
    try {
      const res = await fetch('/api/configuracion/cadenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      showToast('success', 'Descuento eliminado')
      await cargar()
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-red-600" />
            Cadenas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Configurá los descuentos comerciales por cadena y familia de producto
          </p>
        </div>
      </div>

      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm border ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar cadenas */}
          <div className="w-52 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Cadenas</p>
            {cadenas.map(c => {
              const nDescuentos = descuentos.filter(d => d.cadena === c).length
              return (
                <button
                  key={c}
                  onClick={() => { setCadenaActiva(c); setShowForm(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition ${
                    cadenaActiva === c
                      ? 'bg-red-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{CADENA_FLAGS[c] ?? '⚪'}</span>
                    {c}
                  </span>
                  {nDescuentos > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      cadenaActiva === c
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {nDescuentos}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Panel derecho */}
          <div className="flex-1 space-y-4">
            {cadenaActiva && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {CADENA_FLAGS[cadenaActiva] ?? '⚪'} {cadenaActiva}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Descuentos comerciales sobre precio de lista
                      </p>
                    </div>
                    {!showForm && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar descuento
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-gray-50">
                    {descuentosCadena.length === 0 && !showForm && (
                      <div className="px-5 py-8 text-center text-gray-400 text-sm">
                        Sin descuentos configurados para esta cadena
                      </div>
                    )}

                    {descuentosCadena.map(d => {
                      const fc = FAMILIA_LABELS[d.familia ?? ''] ?? { color: 'bg-gray-100 text-gray-700 border-gray-300' }
                      return (
                        <div key={d.id} className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${fc.color}`}>
                              {d.familia ?? 'Todas las familias'}
                            </span>
                            <div className="flex items-center gap-1 text-gray-500 text-sm">
                              <Percent className="w-3.5 h-3.5" />
                              <span className="font-semibold text-gray-900 text-base">{d.descuento_pct}%</span>
                              <span className="text-gray-400">descuento</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">desde {d.vigencia_desde}</span>
                            <button
                              onClick={() => eliminar(d.id)}
                              disabled={saving === d.id}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded transition disabled:opacity-50"
                            >
                              {saving === d.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {showForm && (
                      <div className="px-5 py-4 bg-blue-50 border-t border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 mb-3">Nueva regla de descuento</p>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 mb-1 block">Familia (vacío = todas)</label>
                            <div className="relative">
                              <select
                                value={nuevaFamilia}
                                onChange={e => setNuevaFamilia(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option value="">— Todas las familias —</option>
                                {familiasDisponibles.map(f => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="w-32">
                            <label className="text-xs text-gray-600 mb-1 block">Descuento %</label>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              step={0.5}
                              value={nuevoPct}
                              onChange={e => setNuevoPct(e.target.value)}
                              placeholder="ej. 25"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={guardarNuevo}
                              disabled={saving === 'nuevo'}
                              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                              {saving === 'nuevo'
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Save className="w-4 h-4" />}
                              Guardar
                            </button>
                            <button
                              onClick={() => { setShowForm(false); setNuevaFamilia(''); setNuevoPct('') }}
                              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                  <strong className="text-gray-700">¿Cómo se aplica?</strong>{' '}
                  El descuento se resta del precio de lista IVA incluido:{' '}
                  <code className="ml-1 bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">
                    precio_efectivo = precio_iva × (1 − descuento%)
                  </code>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
