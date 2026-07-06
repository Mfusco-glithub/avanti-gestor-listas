'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import Link from 'next/link'
import {
  CheckSquare, Loader2, ChevronDown, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Info, ArrowRight,
  CheckCircle2, Clock, History, X, FileDown,
} from 'lucide-react'
import type { ItemVerificacion, CadenaConSimulacion } from '@/app/api/verificacion/route'

// ------------------------------ Helpers ----------------------------------------

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDec(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

// ------------------------------ Componentes ----------------------------------------

function VarBadge({ varPct }: { varPct: number | null }) {
  if (varPct === null) return <span className="text-gray-300 text-xs">—</span>
  const isUp = varPct > 0
  const color = isUp ? 'text-emerald-700 bg-emerald-50' : varPct < 0 ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'
  const Icon = isUp ? TrendingUp : varPct < 0 ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      <Icon className="w-3 h-3" />{varPct > 0 ? '+' : ''}{varPct.toFixed(1)}%
    </span>
  )
}

// ------------------------------ Botón generador de listas ----------------------------------------

const IMP = { label: 'Importación sistema', formato: 'xlsx_importacion' }

const FORMATOS_POR_CADENA: Record<string, { label: string; formato: string }[]> = {
  DISCO:      [{ label: 'Lista DISCO', formato: 'xlsx_disco' }, { label: 'Tabla GDU', formato: 'xlsx_gdu' }, IMP],
  DEVOTO:     [{ label: 'Lista DISCO', formato: 'xlsx_disco' }, { label: 'Tabla GDU', formato: 'xlsx_gdu' }, IMP],
  GEANT:      [{ label: 'Lista DISCO', formato: 'xlsx_disco' }, { label: 'Tabla GDU', formato: 'xlsx_gdu' }, IMP],
  TIENDA:     [{ label: 'Lista Tienda Inglesa', formato: 'xlsx_tienda' }, IMP],
  TATA:       [{ label: 'Lista TA-TA', formato: 'xlsx_disco' }, IMP],
  MACRO:      [{ label: 'Lista MACRO', formato: 'xlsx_macro' }, IMP],
  PEDIDOSYA:  [{ label: 'Cambio de Precios PY', formato: 'xlsx_pedidosya' }, IMP],
  COMERCIO:   [{ label: 'Lista Comercio', formato: 'xlsx_comercio' }, IMP],
  INTERIOR:   [{ label: 'Lista Interior / Distribuidor', formato: 'xlsx_interior' }, IMP],
}

function BotonGenerar({ simulacion_id, cadena }: { simulacion_id: string; cadena: string }) {
  const [descargando, setDescargando] = useState<string | null>(null)
  const formatos = FORMATOS_POR_CADENA[cadena] ?? [{ label: 'Descargar lista', formato: 'xlsx_disco' }]

  const descargar = async (formato: string, label: string) => {
    setDescargando(formato)
    try {
      const res = await fetch('/api/listas/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulacion_id, cadena, formato }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al generar')
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `lista-${cadena.toLowerCase()}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al descargar')
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {formatos.map(({ label, formato }) => (
        <button
          key={formato}
          onClick={() => descargar(formato, label)}
          disabled={!!descargando}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
        >
          {descargando === formato
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <FileDown className="w-3.5 h-3.5" />}
          {label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------ Página principal ----------------------------------------

export default function VerificacionPage() {
  const [cadenas, setCadenas] = useState<CadenaConSimulacion[]>([])
  const [cadenaActiva, setCadenaActiva] = useState('')
  const [familias, setFamilias] = useState<string[]>([])
  const [familiaFiltro, setFamiliaFiltro] = useState('')
  const [items, setItems] = useState<ItemVerificacion[]>([])
  const [listaAnteriorVigencia, setListaAnteriorVigencia] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aprobando, setAprobando] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  type HistorialItem = { id: string; cadena: string; nombre: string | null; vigencia_desde: string; estado: string; verificada_en: string | null }
  const [historial, setHistorial] = useState<HistorialItem[]>([])

  useEffect(() => {
    fetch('/api/verificacion', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const lista: CadenaConSimulacion[] = d.cadenas ?? []
        setCadenas(lista)
        if (lista.length > 0) setCadenaActiva(lista[0].cadena)
      })
  }, [])

  const cargar = useCallback(async () => {
    if (!cadenaActiva) return
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ cadena: cadenaActiva })
      if (familiaFiltro) params.set('familia', familiaFiltro)
      const res = await fetch('/api/verificacion?' + params, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items ?? [])
      setFamilias(data.familias ?? [])
      setListaAnteriorVigencia(data.lista_anterior_vigencia ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [cadenaActiva, familiaFiltro])

  useEffect(() => { cargar() }, [cargar])

  const cargarHistorial = useCallback(async () => {
    if (!cadenaActiva) return
    const res = await fetch(`/api/verificacion/historial?cadena=${cadenaActiva}`, { cache: 'no-store' })
    const data = await res.json()
    setHistorial(data.historial ?? [])
  }, [cadenaActiva])

  useEffect(() => {
    if (historialOpen) cargarHistorial()
  }, [historialOpen, cargarHistorial])

  const aprobar = async () => {
    const sim = cadenas.find(c => c.cadena === cadenaActiva)
    if (!sim) return
    if (!confirm(`¿Aprobar verificación para ${cadenaActiva} (${sim.nombre ?? sim.vigencia_desde})?`)) return
    setAprobando(true)
    try {
      const res = await fetch('/api/verificacion/aprobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulacion_id: sim.simulacion_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Actualizar estado local
      setCadenas(prev => prev.map(c =>
        c.cadena === cadenaActiva
          ? { ...c, estado: 'verificada', verificada_en: data.simulacion.verificada_en }
          : c
      ))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar')
    } finally {
      setAprobando(false)
    }
  }

  const MARCA_COLORS: Record<string, { header: string; text: string; dot: string }> = {
    'AVANTI':     { header: 'bg-red-600',   text: 'text-white', dot: 'bg-red-200' },
    'PASTAMANÍA': { header: 'bg-blue-600',  text: 'text-white', dot: 'bg-blue-200' },
    'QUE TAPA':   { header: 'bg-amber-500', text: 'text-white', dot: 'bg-amber-200' },
  }
  const getMarcaColor = (m: string) => MARCA_COLORS[m] ?? { header: 'bg-gray-500', text: 'text-white', dot: 'bg-gray-200' }

  type Grupo = { familia: string; subfamilia: string; filas: ItemVerificacion[] }
  type GrupoMarca = { marca: string; grupos: Grupo[] }

  const itemsFiltrados = familiaFiltro ? items.filter(i => i.familia === familiaFiltro) : items

  const gruposMarca: GrupoMarca[] = []
  let lastMarca = '', lastFam = '', lastSub = ''
  for (const item of itemsFiltrados) {
    if (item.marca !== lastMarca) {
      gruposMarca.push({ marca: item.marca, grupos: [] })
      lastMarca = item.marca; lastFam = ''; lastSub = ''
    }
    const gm = gruposMarca[gruposMarca.length - 1]
    if (item.familia !== lastFam || item.subfamilia !== lastSub) {
      gm.grupos.push({ familia: item.familia, subfamilia: item.subfamilia, filas: [] })
      lastFam = item.familia; lastSub = item.subfamilia
    }
    gm.grupos[gm.grupos.length - 1].filas.push(item)
  }

  const isInterior = cadenaActiva === 'INTERIOR'
  const totalItems = itemsFiltrados.length
  const margenes = itemsFiltrados.map(i => i.margen_pct).filter((m): m is number => m !== null)
  const margenProm = margenes.length ? margenes.reduce((a, b) => a + b, 0) / margenes.length : null
  const bajoMargen = margenes.filter(m => m < 25).length
  const cadenaMeta = cadenas.find(c => c.cadena === cadenaActiva)

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-red-600" />
          Verificación de Márgenes
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Revisá los márgenes antes de generar las listas.
        </p>
      </div>

      {cadenas.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Info className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay simulaciones ejecutadas todavía</p>
          <p className="text-gray-400 text-sm mt-1">Ejecutá una simulación y volvé aquí para verificar los márgenes.</p>
          <Link href="/simulador" className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium">
            Ir al Simulador <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {cadenas.length > 0 && (
        <>
          <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
            {cadenas.map(c => (
              <button key={c.cadena}
                onClick={() => { setCadenaActiva(c.cadena); setFamiliaFiltro('') }}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                  cadenaActiva === c.cadena ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                {c.cadena}
              </button>
            ))}
          </div>

          {cadenaMeta && (
            <div className="flex flex-wrap items-center gap-3 text-xs bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
              {cadenaMeta.estado === 'verificada' ? (
                <span className="flex items-center gap-1.5 text-green-700 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Verificada
                  {cadenaMeta.verificada_en && (
                    <span className="font-normal text-green-600">· {fmtFecha(cadenaMeta.verificada_en.slice(0, 10))}</span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <Clock className="w-4 h-4" />
                  Pendiente de aprobación
                </span>
              )}
              {cadenaMeta.nombre && <span className="font-medium text-gray-700">{cadenaMeta.nombre}</span>}
              {cadenaMeta.vigencia_desde && (
                <span className="text-gray-500">Vigencia nueva: <strong className="text-gray-700">{fmtFecha(cadenaMeta.vigencia_desde)}</strong></span>
              )}
              {listaAnteriorVigencia && (
                <span className="text-blue-600">Lista base: <strong>{fmtFecha(listaAnteriorVigencia)}</strong></span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setHistorialOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition text-xs"
                >
                  <History className="w-3.5 h-3.5" />
                  Historial
                </button>
                {cadenaMeta.estado !== 'verificada' && (
                  <button
                    onClick={aprobar}
                    disabled={aprobando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                  >
                    {aprobando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Aprobar verificación
                  </button>
                )}
                {cadenaMeta.estado === 'verificada' && (
                  <BotonGenerar simulacion_id={cadenaMeta.simulacion_id} cadena={cadenaActiva} />
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center">
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
            {!loading && totalItems > 0 && (
              <div className="flex items-center gap-5 ml-auto text-xs">
                <div className="text-center">
                  <div className="text-gray-400">Productos</div>
                  <div className="font-semibold text-gray-700 text-sm">{totalItems}</div>
                </div>
                {margenProm !== null && (
                  <div className="text-center">
                    <div className="text-gray-400">Margen promedio</div>
                    <div className={`font-semibold text-sm ${margenProm >= 30 ? 'text-green-700' : margenProm >= 25 ? 'text-yellow-700' : 'text-red-700'}`}>
                      {margenProm.toFixed(1)}%
                    </div>
                  </div>
                )}
                {bajoMargen > 0 && (
                  <div className="text-center">
                    <div className="text-gray-400">Bajo 25%</div>
                    <div className="font-semibold text-sm text-red-600">{bajoMargen}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              {cadenaActiva ? `Sin datos para ${cadenaActiva}` : 'Seleccioná una cadena'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: isInterior ? '1250px' : '1050px' }}>
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider" rowSpan={2}>
                        Producto
                      </th>
                      <th colSpan={isInterior ? 4 : 3} className="text-center px-3 py-2 text-xs font-bold text-blue-800 uppercase tracking-wider bg-blue-50 border-l border-blue-200">
                        Lista anterior
                        {listaAnteriorVigencia && (
                          <span className="ml-2 font-normal normal-case text-blue-600 text-xs">({fmtFecha(listaAnteriorVigencia)})</span>
                        )}
                      </th>
                      <th colSpan={isInterior ? 6 : 5} className="text-center px-3 py-2 text-xs font-bold text-red-800 uppercase tracking-wider bg-red-50 border-l border-red-200">
                        Simulación de aumento
                        {cadenaMeta?.vigencia_desde && (
                          <span className="ml-2 font-normal normal-case text-red-600 text-xs">(vigencia {fmtFecha(cadenaMeta.vigencia_desde)})</span>
                        )}
                      </th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-right px-3 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wider w-24 bg-blue-50/60 border-l border-blue-200">PVP actual</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wider w-28 bg-blue-50/60">
                        {isInterior ? 'Precio Dist' : 'Precio Comercio'}<span className="block font-normal normal-case text-blue-500 text-xs">c/IVA</span>
                      </th>
                      {isInterior && (
                        <th className="text-right px-3 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wider w-28 bg-blue-50/60">
                          Precio Comercio<span className="block font-normal normal-case text-blue-500 text-xs">c/IVA</span>
                        </th>
                      )}
                      <th className="text-center px-3 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wider w-20 bg-blue-50/60">
                        Markup Act.<span className="block font-normal normal-case text-blue-400 text-xs">lista actual</span>
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-red-700 uppercase tracking-wider w-24 bg-red-50/30 border-l border-red-200">PVP nuevo</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider w-20 bg-red-50/30">Var %</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 bg-red-50/30">
                        Markup Prop.<span className="block font-normal normal-case text-gray-400 text-xs">lista propuesta</span>
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 bg-red-50/30">
                        Precio Neto<span className="block font-normal normal-case text-gray-400 text-xs">s/IVA</span>
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 bg-red-50/30">
                        {isInterior ? 'Precio Dist' : 'Precio Comercio'}<span className="block font-normal normal-case text-gray-400 text-xs">c/IVA</span>
                      </th>
                      {isInterior && (
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 bg-red-50/30">
                          Precio Comercio<span className="block font-normal normal-case text-gray-400 text-xs">c/IVA</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {gruposMarca.map(({ marca, grupos }) => {
                      const col = getMarcaColor(marca)
                      const totalMarca = grupos.reduce((s, g) => s + g.filas.length, 0)
                      return (
                        <Fragment key={marca}>
                          {/* ── Franja de marca ── */}
                          <tr>
                            <td colSpan={isInterior ? 11 : 9} className={`px-4 py-2.5 ${col.header}`}>
                              <div className="flex items-center gap-2.5">
                                <span className={`text-sm font-bold tracking-wide ${col.text}`}>{marca}</span>
                                <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${col.dot} ${col.header.replace('bg-', 'text-').replace('-600', '-900').replace('-500', '-900')}`}>
                                  {totalMarca} producto{totalMarca !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {/* ── Grupos familia/subfamilia dentro de la marca ── */}
                          {grupos.map(({ familia, subfamilia, filas }) => (
                            <Fragment key={`${marca}-${familia}-${subfamilia}`}>
                              <tr className="bg-gray-200 border-t border-b border-gray-300">
                                <td colSpan={isInterior ? 11 : 9} className="px-6 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">{familia}</span>
                                    {subfamilia && subfamilia !== familia && (
                                      <><span className="text-gray-400">›</span><span className="text-xs font-medium text-gray-600">{subfamilia}</span></>
                                    )}
                                    <span className="text-xs text-gray-500 ml-1">({filas.length})</span>
                                  </div>
                                </td>
                              </tr>
                              {filas.map(item => (
                                <tr key={item.ean} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-800 text-xs leading-tight">{item.descripcion}</div>
                                    <div className="text-gray-400 text-xs mt-0.5">{item.ean}</div>
                                  </td>
                                  <td className="px-3 py-3 text-right text-blue-700 tabular-nums text-xs font-medium bg-blue-50/20 border-l border-blue-100">
                                    {fmt(item.pvp_actual)}
                                  </td>
                                  <td className="px-3 py-3 text-right text-blue-600 tabular-nums text-xs bg-blue-50/20">
                                    {fmtDec(item.precio_fact_anterior)}
                                  </td>
                                  {isInterior && (
                                    <td className="px-3 py-3 text-right text-blue-600 tabular-nums text-xs bg-blue-50/20">
                                      {fmtDec(item.precio_dist_anterior)}
                                    </td>
                                  )}
                                  <td className="px-3 py-3 text-center bg-blue-50/20">
                                    {item.margen_pct_anterior !== null
                                      ? (() => {
                                          const mb = item.margen_pct_anterior
                                          const cls = mb >= 35 ? 'text-emerald-700 bg-emerald-50'
                                            : mb >= 28 ? 'text-blue-700 bg-blue-50'
                                            : mb >= 22 ? 'text-yellow-700 bg-yellow-50'
                                            : 'text-red-700 bg-red-50'
                                          return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{mb.toFixed(1)}%</span>
                                        })()
                                      : <span className="text-gray-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-3 py-3 text-right font-semibold text-red-700 tabular-nums text-xs bg-red-50/10 border-l border-red-100">
                                    {fmt(item.pvp_sugerido)}
                                  </td>
                                  <td className="px-3 py-3 text-center bg-red-50/10">
                                    <VarBadge varPct={item.var_pct} />
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums text-xs bg-red-50/10">
                                    {item.margen_pct !== null
                                      ? (() => {
                                          const mb = item.margen_pct
                                          const cls = mb >= 35 ? 'text-emerald-700 font-semibold'
                                            : mb >= 28 ? 'text-blue-700 font-medium'
                                            : mb >= 22 ? 'text-yellow-700 font-medium'
                                            : 'text-red-600 font-semibold'
                                          return <span className={cls}>{mb.toFixed(1)}%</span>
                                        })()
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums text-xs bg-red-50/10">
                                    {fmtDec(item.precio_neto)}
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums text-xs bg-red-50/10">
                                    {fmtDec(item.precio_iva_calc)}
                                  </td>
                                  {isInterior && (
                                    <td className="px-3 py-3 text-right tabular-nums text-xs bg-red-50/10">
                                      {fmtDec(item.precio_dist_nuevo)}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </Fragment>
                          ))}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                <span><strong className="text-blue-700">Bloque 1</strong>: precios de la lista anterior</span>
                <span><strong className="text-red-700">Bloque 2</strong>: precios post-simulación</span>
                <span><strong>{isInterior ? 'Precio Dist' : 'Precio Comercio'} c/IVA</strong> = Neto DB * (1 - Dto%) * (1 + IVA)</span>
                {isInterior && <span><strong>Precio Comercio c/IVA</strong> = precio lista COMERCIO (precio al que el distribuidor vende al comercio)</span>}
                <span><strong>Markup %</strong> = (PVP - Precio c/IVA) / Precio c/IVA</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Panel historial (slide-in) ── */}
      {historialOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setHistorialOpen(false)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                Historial de verificaciones · {cadenaActiva}
              </h2>
              <button onClick={() => setHistorialOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            {historial.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
                Sin historial registrado para {cadenaActiva}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {historial.map(h => (
                  <div key={h.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800">{h.nombre ?? '—'}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">Vigencia {fmtFecha(h.vigencia_desde)}</span>
                          {h.verificada_en && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(h.verificada_en).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ h.estado === 'ejecutada' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200' }`}>
                            {h.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
