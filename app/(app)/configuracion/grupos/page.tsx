'use client'

import { useEffect, useState, useCallback } from 'react'
import { Layers, Save, CheckCircle, AlertCircle, Loader2, ChevronDown } from 'lucide-react'

interface Producto {
  id: string
  descripcion: string
  marca: string | null
  sub_familia: string | null
  grupo_comparable: number | null
  segmento: string | null
}

type Segmento = 'primera' | 'segunda' | 'marca_propia' | 'value'

const SEGMENTOS: { value: Segmento; short: string; bg: string; text: string }[] = [
  { value: 'primera',      short: '1ra',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  { value: 'segunda',      short: '2da',   bg: 'bg-green-100',  text: 'text-green-700' },
  { value: 'marca_propia', short: 'M.P.',  bg: 'bg-purple-100', text: 'text-purple-700' },
  { value: 'value',        short: 'Value', bg: 'bg-orange-100', text: 'text-orange-700' },
]

const GRUPO_COLORS = [
  'border-yellow-400 bg-yellow-100 text-yellow-800',
  'border-pink-400 bg-pink-100 text-pink-800',
  'border-cyan-400 bg-cyan-100 text-cyan-800',
  'border-lime-400 bg-lime-100 text-lime-800',
  'border-violet-400 bg-violet-100 text-violet-800',
  'border-amber-400 bg-amber-100 text-amber-800',
  'border-teal-400 bg-teal-100 text-teal-800',
  'border-rose-400 bg-rose-100 text-rose-800',
]

function getGrupoColor(grupo: number | null) {
  if (!grupo) return 'border-gray-200 bg-white text-gray-400'
  return GRUPO_COLORS[(grupo - 1) % GRUPO_COLORS.length]
}

export default function GruposComparablesPage() {
  const [familias, setFamilias] = useState<string[]>([])
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [cambiosGrupo, setCambiosGrupo] = useState<Record<string, number | null>>({})
  const [cambiosSegmento, setCambiosSegmento] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/configuracion/grupos')
      .then((r) => r.json())
      .then((d) => {
        setFamilias(d.familias ?? [])
        if (d.familias?.length > 0) setFamiliaSeleccionada(d.familias[0])
      })
  }, [])

  const cargarProductos = useCallback(async (fam: string) => {
    if (!fam) return
    setLoading(true)
    setCambiosGrupo({})
    setCambiosSegmento({})
    try {
      const res = await fetch('/api/configuracion/grupos?familia=' + encodeURIComponent(fam))
      const data = await res.json()
      setProductos(data.productos ?? [])
    } catch {
      setToast({ type: 'error', msg: 'Error al cargar productos' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (familiaSeleccionada) cargarProductos(familiaSeleccionada)
  }, [familiaSeleccionada, cargarProductos])

  function getGrupo(p: Producto): number | null {
    return p.id in cambiosGrupo ? cambiosGrupo[p.id] : p.grupo_comparable
  }

  function getSegmento(p: Producto): string | null {
    return (p.marca && p.marca in cambiosSegmento) ? cambiosSegmento[p.marca] : p.segmento
  }

  function setGrupo(id: string, val: string) {
    const num = val === '' ? null : parseInt(val, 10)
    setCambiosGrupo((prev) => ({ ...prev, [id]: isNaN(num as number) ? null : num }))
  }

  function toggleSegmento(marca: string, segActual: string | null, clicked: Segmento) {
    setCambiosSegmento((prev) => ({ ...prev, [marca]: segActual === clicked ? null : clicked }))
  }

  async function guardar() {
    const hayGrupos = Object.keys(cambiosGrupo).length > 0
    const haySegmentos = Object.keys(cambiosSegmento).length > 0
    if (!hayGrupos && !haySegmentos) return
    setSaving(true)
    try {
      const promises: Promise<Response>[] = []
      if (hayGrupos) {
        promises.push(fetch('/api/configuracion/grupos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cambios: Object.entries(cambiosGrupo).map(([id, grupo_comparable]) => ({ id, grupo_comparable })) }),
        }))
      }
      if (haySegmentos) {
        promises.push(fetch('/api/configuracion/marcas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cambios: Object.entries(cambiosSegmento).map(([marca, segmento]) => ({ marca, segmento })) }),
        }))
      }
      const responses = await Promise.all(promises)
      for (const res of responses) {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      }
      const total = Object.keys(cambiosGrupo).length + Object.keys(cambiosSegmento).length
      setToast({ type: 'success', msg: `Guardado: ${total} cambios aplicados` })
      setCambiosGrupo({})
      setCambiosSegmento({})
      cargarProductos(familiaSeleccionada)
    } catch (e: unknown) {
      setToast({ type: 'error', msg: e instanceof Error ? e.message : 'Error al guardar' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  // Agrupar por subfamilia — excluir productos sin subfamilia asignada
  const SIN_CLASIFICAR = ['—', 'Sin Clasificar', 'sin clasificar']
  const porSubfamilia = productos.reduce<Record<string, Producto[]>>((acc, p) => {
    const key = p.sub_familia ?? '—'
    if (SIN_CLASIFICAR.includes(key)) return acc  // omitir sin subfamilia
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  // Próximo grupo sugerido por subfamilia (grupo es relativo a familia+subfamilia)
  function proximoGrupo(subfamilia: string): number {
    const prods = productos.filter((p) => (p.sub_familia ?? '—') === subfamilia)
    return Math.max(0, ...prods.map((p) => getGrupo(p) ?? 0)) + 1
  }

  const totalCambios = Object.keys(cambiosGrupo).length + Object.keys(cambiosSegmento).length
  const productosClasificables = productos.filter((p) => !SIN_CLASIFICAR.includes(p.sub_familia ?? '—'))
  const conGrupo = productosClasificables.filter((p) => getGrupo(p) !== null).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-red-600" />
            Grupos Comparables
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Asigna el mismo numero a productos equivalentes entre marcas · el numero se reinicia por subfamilia
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={totalCambios === 0 || saving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {totalCambios > 0 ? 'Guardar (' + totalCambios + ')' : 'Sin cambios'}
        </button>
      </div>

      {toast && (
        <div className={'flex items-center gap-3 px-4 py-3 rounded-lg text-sm border ' + (toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200')}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Como funciona:</strong> Dentro de cada subfamilia, asigna el mismo numero a productos equivalentes entre marcas.
        El numero 1 en "Tapas Empanada" es independiente del 1 en "Salsas".
        Hace clic en un segmento para clasificar la marca (aplica a todos sus productos).
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 shrink-0">Familia:</label>
        <div className="relative">
          <select value={familiaSeleccionada} onChange={(e) => setFamiliaSeleccionada(e.target.value)}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-64">
            {familias.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {!loading && productos.length > 0 && (
          <span className="text-sm text-gray-500">{productosClasificables.length} productos · {conGrupo} con grupo asignado</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porSubfamilia).sort(([a], [b]) => a.localeCompare(b)).map(([subfamilia, prods]) => {
            const conGrupoSub = prods.filter((p) => getGrupo(p) !== null).length
            const next = proximoGrupo(subfamilia)
            return (
              <div key={subfamilia} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 text-sm">{subfamilia}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{conGrupoSub}/{prods.length} clasificados</span>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                      proximo: <strong className="text-red-600">{next}</strong>
                    </span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-2.5 font-medium text-gray-500 text-xs">Descripcion</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs w-36">Marca</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Segmento</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs w-28">Grupo #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {prods.map((p) => {
                      const grupo = getGrupo(p)
                      const segmento = getSegmento(p)
                      const modificado = (p.id in cambiosGrupo) || (p.marca ? p.marca in cambiosSegmento : false)
                      return (
                        <tr key={p.id} className={'transition ' + (modificado ? 'bg-yellow-50' : 'hover:bg-gray-50')}>
                          <td className="px-5 py-3 text-gray-900">
                            {p.descripcion}
                            {modificado && <span className="ml-1 text-xs text-yellow-600">●</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs font-medium">{p.marca ?? '—'}</td>
                          <td className="px-4 py-3">
                            {p.marca ? (
                              <div className="flex gap-1 flex-wrap">
                                {SEGMENTOS.map((s) => (
                                  <button key={s.value}
                                    onClick={() => toggleSegmento(p.marca!, segmento, s.value)}
                                    className={'px-2 py-0.5 rounded-full text-xs font-medium border transition ' + (segmento === s.value ? s.bg + ' ' + s.text + ' border-transparent' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600')}>
                                    {s.short}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">sin marca</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <input type="number" min={1} max={99}
                                value={grupo ?? ''}
                                onChange={(e) => setGrupo(p.id, e.target.value)}
                                placeholder="—"
                                className={'w-16 text-center px-2 py-1.5 border-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 transition ' + getGrupoColor(grupo)}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
          {productos.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              No hay productos en esta familia
            </div>
          )}
        </div>
      )}
    </div>
  )
}
