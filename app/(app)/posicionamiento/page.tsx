'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { TrendingUp, Loader2, ChevronDown, AlertTriangle, Info, Check } from 'lucide-react'

type Segmento = 'primera' | 'segunda' | 'marca_propia' | 'value' | null

interface Competidor {
  descripcion: string
  marca: string
  peso_unidad: string
  sub_familia: string
  segmento: Segmento
  precio_max: number
  pct_vs_avanti: number | null
}

interface GrupoFila {
  grupo: number | null
  familia: string
  subfamilia: string
  avanti: { precio: number; descripcion: string } | null
  avanti_por_cadena: Record<string, number>
  por_cadena: Record<string, { competidores: Competidor[] }>
}

const SEGMENTOS = [
  { value: 'primera' as Segmento,      label: 'Primera Marca',  color: 'text-blue-700',   bg: 'bg-blue-50'   },
  { value: 'segunda' as Segmento,      label: 'Segunda Marca',  color: 'text-green-700',  bg: 'bg-green-50'  },
  { value: 'marca_propia' as Segmento, label: 'Marca Propia',   color: 'text-purple-700', bg: 'bg-purple-50' },
  { value: 'value' as Segmento,        label: 'Value',          color: 'text-orange-700', bg: 'bg-orange-50' },
]

function fmt(n: number) {
  return '$' + n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-400 text-xs">—</span>
  const positive = pct > 0
  const neutral = pct === 0
  return (
    <span className={
      'text-xs font-medium px-1.5 py-0.5 rounded ' +
      (neutral ? 'bg-gray-100 text-gray-600' : positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
    }>
      {positive ? '+' : ''}{pct}%
    </span>
  )
}

// ── Multi-select dropdown ──────────────────────────────────────────────────
function MultiSelectCadenas({
  cadenas, selected, onChange,
}: {
  cadenas: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggle = (c: string) =>
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c])

  const label =
    selected.length === 0 ? 'Seleccionar cadenas...' :
    selected.length === cadenas.length ? 'Todas las cadenas' :
    selected.length <= 2 ? selected.join(', ') :
    `${selected.length} cadenas seleccionadas`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={
          'flex items-center gap-2 pl-3 pr-3 py-2 border rounded-lg text-sm bg-white min-w-56 hover:bg-gray-50 transition ' +
          (open ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200')
        }
      >
        <span className="flex-1 text-left text-gray-700">{label}</span>
        <ChevronDown className={'w-4 h-4 text-gray-400 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-56">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Cadenas</span>
            <button
              onClick={() => onChange(selected.length === cadenas.length ? [] : [...cadenas])}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              {selected.length === cadenas.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          {cadenas.map((c) => (
            <label key={c} onClick={() => toggle(c)} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
              <div className={
                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ' +
                (selected.includes(c) ? 'bg-red-600 border-red-600' : 'border-gray-300')
              }>
                {selected.includes(c) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-gray-700">{c}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function PosicionamientoPage() {
  const [cadenas, setCadenas] = useState<string[]>([])
  const [familias, setFamilias] = useState<string[]>([])
  const [cademasSeleccionadas, setCademasSeleccionadas] = useState<string[]>([])
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState('')
  const [semanas, setSemanas] = useState(8)
  const [filas, setFilas] = useState<GrupoFila[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})

  // Carga inicial: obtener cadenas y familias disponibles
  useEffect(() => {
    fetch('/api/posicionamiento', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const cs: string[] = d.cadenas ?? []
        setCadenas(cs)
        setFamilias(d.familias ?? [])
        if (cs.length > 0) setCademasSeleccionadas([cs[0]])
      })
  }, [])

  const cargar = useCallback(async () => {
    if (cademasSeleccionadas.length === 0) {
      setFilas([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        cadenas: cademasSeleccionadas.join(','),
        semanas: String(semanas),
      })
      if (familiaSeleccionada) params.set('familia', familiaSeleccionada)
      const res = await fetch('/api/posicionamiento?' + params.toString(), { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFilas(data.filas ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [cademasSeleccionadas, semanas, familiaSeleccionada])

  useEffect(() => {
    cargar()
  }, [cargar])

  function toggleExpand(key: string) {
    setExpandido((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const conGrupo = filas.filter((f) => f.grupo !== null).length
  const sinGrupo = filas.filter((f) => f.grupo === null).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-red-600" />
          Tablero de Posicionamiento
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Precios máximos por segmento de marca · periodo anti-promocional
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Cadenas</label>
          <MultiSelectCadenas
            cadenas={cadenas}
            selected={cademasSeleccionadas}
            onChange={setCademasSeleccionadas}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Familia</label>
          <div className="relative">
            <select
              value={familiaSeleccionada}
              onChange={(e) => setFamiliaSeleccionada(e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-52"
            >
              <option value="">Todas las familias</option>
              {familias.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Periodo anti-promo</label>
          <div className="flex gap-1.5">
            {[4, 8, 12].map((s) => (
              <button key={s} onClick={() => setSemanas(s)}
                className={
                  'px-3 py-2 rounded-lg text-sm font-medium border transition ' +
                  (semanas === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                }>
                {s} sem.
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto text-right text-xs text-gray-400">
          <p>{filas.length} grupos · <span className="text-green-600">{conGrupo} con grupo</span></p>
          {sinGrupo > 0 && <p className="text-orange-500">{sinGrupo} sin grupo comparable</p>}
        </div>
      </div>

      {/* Mensajes de estado */}
      {!loading && cademasSeleccionadas.length === 0 && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          Seleccioná una o más cadenas para ver el tablero de posicionamiento.
        </div>
      )}

      {!loading && filas.length > 0 && conGrupo === 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Sin grupos comparables asignados.</strong>{' '}
            Para ver la comparación estructurada Avanti vs competidores, asigná grupos en{' '}
            <a href="/configuracion/grupos" className="underline font-medium">Configuración → Grupos Comparables</a>.
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : cademasSeleccionadas.length > 0 && filas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No hay datos de precios para las cadenas seleccionadas en las últimas {semanas} semanas
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            // Agrupar filas por sub-familia
            const porSubFamilia: { subfamilia: string; filas: typeof filas }[] = []
            const sfIndex: Record<string, number> = {}
            for (const fila of filas) {
              const sf = fila.subfamilia || fila.familia || '—'
              if (sfIndex[sf] === undefined) {
                sfIndex[sf] = porSubFamilia.length
                porSubFamilia.push({ subfamilia: sf, filas: [] })
              }
              porSubFamilia[sfIndex[sf]].filas.push(fila)
            }
            return porSubFamilia.map(({ subfamilia, filas: filasGrupo }) => (
              <div key={subfamilia} className="space-y-2">
                {/* Título de sub-familia */}
                <h2 className="text-base font-bold text-gray-800 px-1 flex items-center gap-2">
                  {subfamilia}
                  <span className="text-xs font-normal text-gray-400">{filasGrupo.length} grupo{filasGrupo.length !== 1 ? 's' : ''}</span>
                </h2>

                <div className="space-y-2">
                {filasGrupo.map((fila, idx) => {
            const key = fila.grupo !== null
              ? `g${fila.grupo}_${fila.familia}_${fila.subfamilia}`
              : `f${subfamilia}_${idx}`
            const isExpanded = expandido[key] !== false

            // Todos los precios de competidores (todas las cadenas combinadas)
            const allPrices = Object.values(fila.por_cadena)
              .flatMap((cd) => cd.competidores.map((c) => c.precio_max))
            const maxPrecio = allPrices.length > 0 ? Math.max(...allPrices) : 0
            const minPrecio = allPrices.length > 0 ? Math.min(...allPrices) : 0
            const totalComp = allPrices.length

            const nombreProducto = fila.grupo !== null && fila.avanti
              ? fila.avanti.descripcion
              : Object.values(fila.por_cadena)[0]?.competidores[0]?.descripcion ?? 'Producto'

            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* ── Fila cabecera (colapsable) ── */}
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition text-left"
                >
                  {/* Número de grupo */}
                  {fila.grupo !== null ? (
                    <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {fila.grupo}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0">—</span>
                  )}

                  {/* Nombre + subtítulo */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{nombreProducto}</div>
                    <div className="text-xs text-gray-400">
                      {fila.familia}
                      {' · '}{totalComp} competidor{totalComp !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  {/* Columnas por cadena: precio Avanti + rango competencia */}
                  <div className="flex items-center gap-5 shrink-0">
                    {cademasSeleccionadas.map((cadena) => {
                      const avantiPrice = fila.avanti_por_cadena[cadena] ?? fila.avanti?.precio ?? null
                      const compData = fila.por_cadena[cadena]
                      const compPrecios = compData?.competidores.map((c) => c.precio_max) ?? []
                      return (
                        <div key={cadena} className="text-center min-w-[72px]">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{cadena}</div>
                          <div className="font-bold text-gray-900 text-sm mt-0.5">
                            {avantiPrice ? fmt(avantiPrice) : '—'}
                          </div>
                          {compPrecios.length > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {compPrecios.length === 1
                                ? fmt(compPrecios[0])
                                : fmt(Math.min(...compPrecios)) + '–' + fmt(Math.max(...compPrecios))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Rango global (solo si hay más de 1 cadena) */}
                    {cademasSeleccionadas.length > 1 && allPrices.length > 0 && (
                      <div className="text-right min-w-[90px] border-l border-gray-100 pl-4">
                        <div className="text-xs text-gray-400">Rango total</div>
                        <div className="text-sm text-gray-600">
                          {fmt(minPrecio)} – {fmt(maxPrecio)}
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronDown className={'w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ' + (isExpanded ? 'rotate-180' : '')} />
                </button>

                {/* ── Detalle expandido: tabla cruzada (productos × cadenas) ── */}
                {isExpanded && (() => {
                  type ProdEntry = {
                    descripcion: string; marca: string; peso_unidad: string
                    segmento: Segmento; precios: Record<string, number>
                  }
                  const prodsMap = new Map<string, ProdEntry>()
                  for (const cadena of cademasSeleccionadas) {
                    for (const comp of fila.por_cadena[cadena]?.competidores ?? []) {
                      const k = `${comp.descripcion}||${comp.marca}`
                      if (!prodsMap.has(k)) {
                        prodsMap.set(k, {
                          descripcion: comp.descripcion, marca: comp.marca,
                          peso_unidad: comp.peso_unidad, segmento: comp.segmento, precios: {},
                        })
                      }
                      prodsMap.get(k)!.precios[cadena] = comp.precio_max
                    }
                  }
                  const allProds = [...prodsMap.values()]
                    .sort((a, b) => a.marca.localeCompare(b.marca) || a.descripcion.localeCompare(b.descripcion))
                  const primeraCadena = cademasSeleccionadas[0]
                  const hasMulti = cademasSeleccionadas.length > 1

                  return (
                    <div className="border-t border-gray-100 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">Descripción</th>
                            <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium w-32">Marca</th>
                            <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium w-20">Peso</th>
                            {cademasSeleccionadas.map((c, i) => (
                              <th key={c} className="px-4 py-2 text-right text-xs text-gray-500 font-medium w-36">
                                <div>{c}</div>
                                {hasMulti && i > 0 && (
                                  <div className="font-normal text-gray-400">vs {primeraCadena}</div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {allProds.map((p, i) => {
                            const pBase = p.precios[primeraCadena]
                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-5 py-2.5 text-gray-700 pl-8">{p.descripcion}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">{p.marca}</td>
                                <td className="px-4 py-2.5 text-gray-400 text-xs">{p.peso_unidad || '—'}</td>
                                {cademasSeleccionadas.map((c, ci) => {
                                  const price = p.precios[c]
                                  const pctVar = hasMulti && ci > 0 && pBase && price
                                    ? Math.round(((price - pBase) / pBase) * 100) : null
                                  return (
                                    <td key={c} className="px-4 py-2.5 text-right">
                                      {price !== undefined ? (
                                        <>
                                          <span className="font-medium text-gray-900">{fmt(price)}</span>
                                          {pctVar !== null && (
                                            <span className={'ml-1.5 text-xs ' + (pctVar > 0 ? 'text-green-600' : pctVar < 0 ? 'text-red-600' : 'text-gray-400')}>
                                              {pctVar > 0 ? '+' : ''}{pctVar}%
                                            </span>
                                          )}
                                        </>
                                      ) : <span className="text-gray-300">—</span>}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )
          })}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
