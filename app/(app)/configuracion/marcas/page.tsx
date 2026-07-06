'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tag, Save, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type Segmento = 'primera' | 'segunda' | 'marca_propia' | 'value' | null

interface MarcaRow {
  marca: string
  count: number
  id: string | null
  segmento: Segmento
  activo: boolean
}

const SEGMENTOS: { value: Segmento; label: string; color: string; bg: string }[] = [
  { value: 'primera',      label: 'Primera Marca',  color: 'text-blue-700',  bg: 'bg-blue-100' },
  { value: 'segunda',      label: 'Segunda Marca',  color: 'text-green-700', bg: 'bg-green-100' },
  { value: 'marca_propia', label: 'Marca Propia',   color: 'text-purple-700',bg: 'bg-purple-100' },
  { value: 'value',        label: 'Value',          color: 'text-orange-700',bg: 'bg-orange-100' },
]

function SegmentoBadge({ segmento }: { segmento: Segmento }) {
  if (!segmento) return <span className="text-xs text-gray-400 italic">Sin clasificar</span>
  const s = SEGMENTOS.find((s) => s.value === segmento)
  if (!s) return null
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  )
}

export default function ConfiguracionMarcasPage() {
  const [marcas, setMarcas] = useState<MarcaRow[]>([])
  const [cambios, setCambios] = useState<Record<string, Segmento>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSegmento, setFiltroSegmento] = useState<Segmento | 'sin_clasificar' | 'todos'>('todos')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/configuracion/marcas')
      const data = await res.json()
      setMarcas(data.marcas ?? [])
    } catch {
      setToast({ type: 'error', msg: 'Error al cargar las marcas' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function cambiarSegmento(marca: string, segmento: Segmento) {
    setCambios((prev) => ({ ...prev, [marca]: segmento }))
  }

  function getSegmentoRow(row: MarcaRow): Segmento {
    if (row.marca in cambios) return cambios[row.marca]
    return row.segmento
  }

  async function guardar() {
    if (Object.keys(cambios).length === 0) return
    setSaving(true)
    try {
      const payload = Object.entries(cambios).map(([marca, segmento]) => ({ marca, segmento }))
      const res = await fetch('/api/configuracion/marcas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cambios: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setToast({ type: 'success', msg: `Guardado: ${data.upserted} clasificaciones actualizadas` })
      setCambios({})
      cargar()
    } catch (e: unknown) {
      setToast({ type: 'error', msg: e instanceof Error ? e.message : 'Error al guardar' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const marcasFiltradas = marcas.filter((row) => {
    const seg = getSegmentoRow(row)
    if (busqueda && !row.marca.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroSegmento === 'sin_clasificar' && seg !== null) return false
    if (filtroSegmento !== 'todos' && filtroSegmento !== 'sin_clasificar' && seg !== filtroSegmento) return false
    return true
  })

  const conteosPorSegmento = {
    total: marcas.length,
    clasificadas: marcas.filter((r) => getSegmentoRow(r) !== null).length,
    primera: marcas.filter((r) => getSegmentoRow(r) === 'primera').length,
    segunda: marcas.filter((r) => getSegmentoRow(r) === 'segunda').length,
    marca_propia: marcas.filter((r) => getSegmentoRow(r) === 'marca_propia').length,
    value: marcas.filter((r) => getSegmentoRow(r) === 'value').length,
  }

  const hayCambios = Object.keys(cambios).length > 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-red-600" />
            Clasificación de Marcas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Asigná cada marca competidora a un segmento para el análisis de posicionamiento
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={!hayCambios || saving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {hayCambios ? `Guardar cambios (${Object.keys(cambios).length})` : 'Sin cambios'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500">Total marcas</p>
          <p className="text-2xl font-bold text-gray-900">{conteosPorSegmento.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Clasificadas</p>
          <p className="text-2xl font-bold text-gray-700">{conteosPorSegmento.clasificadas}</p>
        </div>
        {SEGMENTOS.map((s) => (
          <div key={s.value} className={`rounded-lg border p-3 ${s.bg} border-transparent`}>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>
              {conteosPorSegmento[s.value as keyof typeof conteosPorSegmento]}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar marca..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { value: 'todos', label: 'Todas' },
            { value: 'sin_clasificar', label: 'Sin clasificar' },
            ...SEGMENTOS.map((s) => ({ value: s.value, label: s.label })),
          ] as { value: string; label: string }[]).map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroSegmento(f.value as typeof filtroSegmento)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filtroSegmento === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Marca</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-24">Productos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Segmento actual</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Asignar segmento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {marcasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">
                    No se encontraron marcas con esos filtros
                  </td>
                </tr>
              ) : (
                marcasFiltradas.map((row) => {
                  const segActual = getSegmentoRow(row)
                  const modificado = row.marca in cambios
                  return (
                    <tr key={row.marca} className={`hover:bg-gray-50 transition ${modificado ? 'bg-yellow-50' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {row.marca}
                        {modificado && <span className="ml-2 text-xs text-yellow-600 font-normal">● modificado</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{row.count}</td>
                      <td className="px-4 py-3">
                        <SegmentoBadge segmento={segActual} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {SEGMENTOS.map((s) => (
                            <button
                              key={s.value}
                              onClick={() => cambiarSegmento(row.marca, segActual === s.value ? null : s.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                                segActual === s.value
                                  ? `${s.bg} ${s.color} border-transparent`
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                          {segActual !== null && (
                            <button
                              onClick={() => cambiarSegmento(row.marca, null)}
                              className="px-2.5 py-1 rounded-full text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {marcasFiltradas.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Mostrando {marcasFiltradas.length} de {marcas.length} marcas
        </p>
      )}
    </div>
  )
}
