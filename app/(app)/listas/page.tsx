'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  List, Loader2, ChevronDown, ChevronRight, AlertTriangle, Info,
  TrendingUp, TrendingDown, Minus, ChevronsUpDown,
} from 'lucide-react'

interface CrossCadenaRow {
  cadena: string
  precio_neto: number
  precio_iva_calc: number | null
  descuento_pct: number | null
  precio_efectivo: number | null
  pvp_scraper: number | null
  margen_real_pct: number | null
}

interface FilaLista {
  ean: string
  descripcion: string
  familia: string
  subfamilia: string
  grupo_comparable: number | null
  producto_id: number | null
  precio_neto: number
  precio_iva_calc: number | null
  pvp_sugerido: number | null
  descuento_pct: number | null
  precio_efectivo: number | null
  pvp_scraper: number | null
  fecha_scraper: string | null
  margen_real_pct: number | null
  comp_min: number | null
  comp_max: number | null
  comp_count: number
  cross_cadena: CrossCadenaRow[]
}

const CADENA_FLAGS: Record<string, string> = {
  MACRO: '🔵', TATA: '🟢', TIENDA: '🟡', DISCO: '🔴', DEVOTO: '🔴', GEANT: '🔴',
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function MargenBadge({ margen }: { margen: number | null }) {
  if (margen === null) return <span className="text-gray-300 text-xs">—</span>
  const isGood = margen >= 30
  const isOk = margen >= 20
  const color = isGood ? 'text-green-700 bg-green-50' : isOk ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'
  const Icon = isGood ? TrendingUp : isOk ? Minus : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <Icon className="w-3 h-3" />{margen.toFixed(1)}%
    </span>
  )
}

function IndexComp({ pvp, compMin, compMax }: { pvp: number | null; compMin: number | null; compMax: number | null }) {
  if (!pvp || !compMin || !compMax) return <span className="text-gray-300 text-xs">—</span>
  const mid = (compMin + compMax) / 2
  const idx = ((pvp - mid) / mid) * 100
  const color = idx < -5 ? 'text-green-700 bg-green-50' : idx > 5 ? 'text-red-700 bg-red-50' : 'text-gray-600 bg-gray-100'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}
      title={`vs rango ${fmt(compMin)} – ${fmt(compMax)}`}>
      {idx > 0 ? '+' : ''}{idx.toFixed(0)}%
    </span>
  )
}

// Coherencia cross-cadena: desviación del precio_efectivo vs la cadena base
function CoherenciaBadge({ efectivo, baseEfectivo }: { efectivo: number | null; baseEfectivo: number | null }) {
  if (!efectivo || !baseEfectivo) return <span className="text-gray-300 text-xs">—</span>
  const diff = ((efectivo - baseEfectivo) / baseEfectivo) * 100
  const abs = Math.abs(diff)
  const color = abs <= 5 ? 'text-gray-500' : abs <= 15 ? 'text-orange-600' : 'text-red-600'
  return (
    <span className={`text-xs font-medium ${color}`}>
      {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
    </span>
  )
}

export default function ListasPage() {
  const [cadenas, setCadenas] = useState<string[]>([])
  const [familias, setFamilias] = useState<string[]>([])
  const [cadenaActiva, setCadenaActiva] = useState('')
  const [familiaFiltro, setFamiliaFiltro] = useState('')
  const [filas, setFilas] = useState<FilaLista[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/listas')
      .then(r => r.json())
      .then(d => {
        setCadenas(d.cadenas ?? [])
        if (d.cadenas?.length > 0) setCadenaActiva(d.cadenas[0])
      })
  }, [])

  const cargar = useCallback(async () => {
    if (!cadenaActiva) return
    setLoading(true)
    setError('')
    setExpandidos(new Set())
    try {
      const params = new URLSearchParams({ cadena: cadenaActiva })
      if (familiaFiltro) params.set('familia', familiaFiltro)
      const res = await fetch('/api/listas?' + params)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFilas(data.filas ?? [])
      setFamilias(data.familias ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [cadenaActiva, familiaFiltro])

  useEffect(() => { cargar() }, [cargar])

  function toggleExpand(ean: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(ean) ? next.delete(ean) : next.add(ean)
      return next
    })
  }

  // Agrupar por familia → subfamilia
  const grupos: { familia: string; subfamilia: string; filas: FilaLista[] }[] = []
  let lastFam = '', lastSub = ''
  for (const f of filas) {
    if (f.familia !== lastFam || f.subfamilia !== lastSub) {
      grupos.push({ familia: f.familia, subfamilia: f.subfamilia, filas: [] })
      lastFam = f.familia; lastSub = f.subfamilia
    }
    grupos[grupos.length - 1].filas.push(f)
  }

  const conScraper = filas.filter(f => f.pvp_scraper !== null).length
  const conDescuento = filas.filter(f => f.descuento_pct !== null).length

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <List className="w-6 h-6 text-red-600" />Lista de Precios por Cadena
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Precios vigentes, descuentos comerciales, márgenes y coherencia entre cadenas
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Cadena</label>
          <div className="relative">
            <select value={cadenaActiva} onChange={e => setCadenaActiva(e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-40">
              {cadenas.map(c => <option key={c} value={c}>{CADENA_FLAGS[c] ?? '⚪'} {c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Familia</label>
          <div className="relative">
            <select value={familiaFiltro} onChange={e => setFamiliaFiltro(e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-52">
              <option value="">Todas las familias</option>
              {familias.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
          <span>{filas.length} productos</span>
          {conDescuento > 0 && <span className="text-orange-600 font-medium">{conDescuento} con descuento comercial</span>}
          {conScraper > 0 && <span className="text-green-600 font-medium">{conScraper} con precio en góndola</span>}
          {conScraper === 0 && cadenaActiva && !loading && (
            <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5" />Sin datos de scraper para {cadenaActiva}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Sin lista de precios para {cadenaActiva}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-6 px-2 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Neto</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">c/IVA</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Desc%</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider w-28 bg-blue-50/50">Efectivo</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">PVP Sug.</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider w-28 bg-green-50/50">PVP Gónda.</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider w-24 bg-green-50/50">Margen</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">vs Mdo.</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map(({ familia, subfamilia, filas: gFilas }) => (
                  <>
                    {/* Header grupo */}
                    <tr key={`h-${familia}-${subfamilia}`} className="bg-gray-50/80 border-t border-b border-gray-100">
                      <td colSpan={10} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{familia}</span>
                          {subfamilia && subfamilia !== familia && (
                            <><span className="text-gray-300">›</span>
                            <span className="text-xs text-gray-500">{subfamilia}</span></>
                          )}
                          <span className="text-xs text-gray-400 ml-1">({gFilas.length})</span>
                        </div>
                      </td>
                    </tr>

                    {gFilas.map((fila) => {
                      const isOpen = expandidos.has(fila.ean)
                      const hasCross = fila.cross_cadena.length > 0
                      return (
                        <>
                          {/* Fila principal */}
                          <tr key={fila.ean}
                            className={`hover:bg-gray-50/50 transition-colors border-b border-gray-50 ${isOpen ? 'bg-blue-50/20' : ''}`}>
                            <td className="px-2 py-3 text-center">
                              {hasCross ? (
                                <button onClick={() => toggleExpand(fila.ean)}
                                  className="p-0.5 text-gray-400 hover:text-blue-600 transition rounded"
                                  title="Ver coherencia entre cadenas">
                                  {isOpen
                                    ? <ChevronDown className="w-4 h-4" />
                                    : <ChevronRight className="w-4 h-4" />}
                                </button>
                              ) : <span className="w-4 block" />}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800 text-xs leading-tight">{fila.descripcion}</div>
                              <div className="text-gray-400 text-xs mt-0.5">{fila.ean}</div>
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700 tabular-nums text-xs">{fmt(fila.precio_neto)}</td>
                            <td className="px-3 py-3 text-right text-gray-700 tabular-nums text-xs">{fmt(fila.precio_iva_calc)}</td>
                            <td className="px-3 py-3 text-center">
                              {fila.descuento_pct !== null
                                ? <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">-{fila.descuento_pct}%</span>
                                : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-3 text-right bg-blue-50/30 font-semibold text-blue-900 tabular-nums text-xs">
                              {fmt(fila.precio_efectivo)}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-400 tabular-nums text-xs">{fmt(fila.pvp_sugerido)}</td>
                            <td className="px-3 py-3 text-right bg-green-50/30 font-medium text-gray-800 tabular-nums text-xs">
                              {fila.pvp_scraper !== null ? (
                                <div>
                                  {fmt(fila.pvp_scraper)}
                                  {fila.fecha_scraper && (
                                    <div className="text-gray-400 text-xs font-normal">
                                      {new Date(fila.fecha_scraper).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                  )}
                                </div>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center bg-green-50/30">
                              <MargenBadge margen={fila.margen_real_pct} />
                            </td>
                            <td className="px-3 py-3 text-center">
                              {fila.comp_count > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <IndexComp pvp={fila.pvp_scraper} compMin={fila.comp_min} compMax={fila.comp_max} />
                                  <span className="text-gray-400 text-xs">{fila.comp_count} comp.</span>
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>

                          {/* Fila expandida: cross-cadena */}
                          {isOpen && hasCross && (
                            <tr key={`x-${fila.ean}`} className="bg-slate-50 border-b border-slate-200">
                              <td />
                              <td colSpan={9} className="px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <ChevronsUpDown className="w-3.5 h-3.5" />
                                  Coherencia entre cadenas — {fila.descripcion}
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-200">
                                      <th className="text-left py-1.5 font-medium w-32">Cadena</th>
                                      <th className="text-right py-1.5 font-medium w-24">Neto</th>
                                      <th className="text-right py-1.5 font-medium w-24">c/IVA</th>
                                      <th className="text-center py-1.5 font-medium w-20">Desc%</th>
                                      <th className="text-right py-1.5 font-medium w-28 text-blue-600">Efectivo</th>
                                      <th className="text-center py-1.5 font-medium w-24 text-slate-500">vs {cadenaActiva}</th>
                                      <th className="text-right py-1.5 font-medium w-28 text-green-700">PVP Gónda.</th>
                                      <th className="text-center py-1.5 font-medium w-24 text-green-700">Margen</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {/* Fila de la cadena activa primero */}
                                    <tr className="bg-blue-50/50">
                                      <td className="py-2 font-bold text-blue-800">
                                        {CADENA_FLAGS[cadenaActiva] ?? '⚪'} {cadenaActiva}
                                        <span className="ml-1 text-blue-400 font-normal">(actual)</span>
                                      </td>
                                      <td className="py-2 text-right tabular-nums text-slate-700">{fmt(fila.precio_neto)}</td>
                                      <td className="py-2 text-right tabular-nums text-slate-700">{fmt(fila.precio_iva_calc)}</td>
                                      <td className="py-2 text-center">
                                        {fila.descuento_pct !== null
                                          ? <span className="text-orange-700 font-semibold">-{fila.descuento_pct}%</span>
                                          : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="py-2 text-right tabular-nums font-bold text-blue-900">{fmt(fila.precio_efectivo)}</td>
                                      <td className="py-2 text-center text-slate-400">base</td>
                                      <td className="py-2 text-right tabular-nums text-slate-700">{fmt(fila.pvp_scraper)}</td>
                                      <td className="py-2 text-center"><MargenBadge margen={fila.margen_real_pct} /></td>
                                    </tr>
                                    {/* Otras cadenas */}
                                    {fila.cross_cadena.map(cc => (
                                      <tr key={cc.cadena} className="hover:bg-slate-100/50">
                                        <td className="py-2 text-slate-700 font-medium">
                                          {CADENA_FLAGS[cc.cadena] ?? '⚪'} {cc.cadena}
                                        </td>
                                        <td className="py-2 text-right tabular-nums text-slate-600">{fmt(cc.precio_neto)}</td>
                                        <td className="py-2 text-right tabular-nums text-slate-600">{fmt(cc.precio_iva_calc)}</td>
                                        <td className="py-2 text-center">
                                          {cc.descuento_pct !== null
                                            ? <span className="text-orange-600 font-semibold">-{cc.descuento_pct}%</span>
                                            : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="py-2 text-right tabular-nums font-semibold text-blue-800">{fmt(cc.precio_efectivo)}</td>
                                        <td className="py-2 text-center">
                                          <CoherenciaBadge efectivo={cc.precio_efectivo} baseEfectivo={fila.precio_efectivo} />
                                        </td>
                                        <td className="py-2 text-right tabular-nums text-slate-600">{fmt(cc.pvp_scraper)}</td>
                                        <td className="py-2 text-center"><MargenBadge margen={cc.margen_real_pct} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
            <span><strong className="text-blue-700">Efectivo</strong> = IVA calc. × (1 − desc. comercial)</span>
            <span><strong className="text-green-700">Margen</strong> = (PVP góndola − efectivo) / PVP góndola</span>
            <span><strong>▶ fila</strong> muestra el mismo SKU en todas las cadenas con su coherencia de precio</span>
            <span className="ml-auto flex items-center gap-3">
              <span className="text-green-700">● ≥30%</span>
              <span className="text-yellow-700">● 20–30%</span>
              <span className="text-red-700">● &lt;20%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
