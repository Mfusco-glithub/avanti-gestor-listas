'use client'

import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import {
  FlaskConical, Loader2, ChevronDown, AlertTriangle, TrendingUp, TrendingDown, Target,
  Save, FolderOpen, Play, X, CheckCircle2, Clock, Pencil, Trash2, Copy, Check, ArrowRight,
} from 'lucide-react'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface AvantiSku {
  ean: string
  descripcion: string
  marca: string
  pvp_sugerido: number | null
  pvp_scraper: number | null
  precio_neto: number
  precio_iva_calc: number | null
  iva_rate: number
}

interface CompetidorGrupo {
  producto_id: number
  descripcion: string
  marca: string
  segmento: string | null
  pvp_actual: number | null
  pvp_min: number | null
}

interface GrupoSimulador {
  familia: string
  subfamilia: string
  grupo: number
  avanti: AvantiSku[]
  competidores: CompetidorGrupo[]
}

interface PriceGroup {
  skus: AvantiSku[]
  pvpBase: number | null
  pct: number
  mbBase: number | null   // MB% actual (sobre pvp_sugerido vigente)
  mbProp: number | null   // MB% propuesto (controla Precio de Facturación, no PVP)
}

interface SimulacionListItem {
  id: string
  nombre: string
  cadena: string
  vigencia_desde: string
  estado: string
  pct_global: number
  pct_competencia: number
  creado_por: string | null
  family_targets: Record<string, number> | null
  created_at: string
  updated_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupAvantiByPrice(
  avanti: AvantiSku[],
  targetPct: number,
  overrides: Record<string, number>,
  mbPropoOverrides: Record<string, number>,
  dtoPct: number = 0,
  familia: string = '',
  marcaDescuentos: Record<string, number> = {},  // overrides por marca: { 'QUE TAPA': 0, ... }
): PriceGroup[] {
  const buckets = new Map<string, AvantiSku[]>()
  for (const sku of avanti) {
    // Agrupa por marca + precio: mismo PVP sugerido → mismo slider de aumento
    const key = sku.pvp_sugerido != null
      ? `${sku.marca}__${sku.pvp_sugerido}`
      : `__null__${sku.ean}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(sku)
  }
  return Array.from(buckets.values()).map(skus => {
    const pvpBase = skus[0].pvp_sugerido ?? null
    const precioNeto = skus[0].precio_neto
    const ivaRate = skus[0].iva_rate
    const precioIvaCalc = skus[0].precio_iva_calc ?? null
    const pct = overrides[skus[0].ean] ?? targetPct

    // DTO efectivo: override por marca si existe, si no el de la familia
    const marcaKey = skus[0].marca?.toUpperCase() ?? ''
    const dtoPctEfectivo = marcaKey in marcaDescuentos ? marcaDescuentos[marcaKey] : dtoPct

    // Precio de factura con IVA = precio_neto × (1−DTO) × (1+IVA)  [misma fórmula que Verificación]
    const precioFactIva = precioNeto * (1 - dtoPctEfectivo) * (1 + ivaRate)

    // Detección masas: solo la familia 'Masas' usa la convención precio_iva = pvp_sugerido.
    // Después de ejecutar una simulación, pvp_sugerido sube pero precio_iva no se actualiza en DB.
    // Para masas usamos precio_iva_calc (que conserva el pvp original) como referencia de MB Act,
    // igual que hace Verificación con pvp_base de los items de simulación.
    const esMasas = familia === 'Masas' && precioIvaCalc !== null && precioIvaCalc > 0
    const pvpParaMb = esMasas ? precioIvaCalc : pvpBase

    // MB Act = margen al PVP de referencia (= MB ACT en Verificación)
    const mbBase = pvpParaMb && pvpParaMb > 0
      ? ((pvpParaMb - precioFactIva) / pvpParaMb) * 100
      : null

    // PVP propuesto = pvpBase + pct%
    const pvpNuevo = pvpBase ? Math.round(pvpBase * (1 + pct / 100)) : null

    // MB Prop: por defecto = MB Act (no cambia al mover el %)
    // Solo cambia si el usuario edita el campo directamente (via mbPropoOverrides)
    const mbPropDefault = mbBase

    // Override manual del usuario si lo editó
    const mbProp = skus[0].ean in mbPropoOverrides
      ? mbPropoOverrides[skus[0].ean]
      : mbPropDefault

    return {
      skus,
      pvpBase,
      pct,
      mbBase,
      mbProp,
    }
  })
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pctFmt(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  const dt = new Date(iso)
  return dt.toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const CADENA_FLAGS: Record<string, string> = {
  MACRO: '🔵', TATA: '🟢', TIENDA: '🟡', DISCO: '🔴', DEVOTO: '🔴', GEANT: '🔴',
}

const SEGMENTO_STYLE: Record<string, string> = {
  primera: 'bg-blue-100 text-blue-800',
  segunda: 'bg-green-100 text-green-800',
  marca_propia: 'bg-purple-100 text-purple-800',
  value: 'bg-orange-100 text-orange-800',
}

const SEGMENTO_LABEL: Record<string, string> = {
  primera: '1ª Marca', segunda: '2ª Marca', marca_propia: 'M. Propia', value: 'Value',
}

// Marcas propias (normalizado sin acentos, mayúsculas)
const OWN_BRANDS_NORM = new Set([
  'AVANTI', 'PASTAS AVANTI', 'EMPANADAS CONGELADAS AVANTI',
  'PIZZAS CONGELADAS AVANTI', 'SALSAS AVANTI',
  'PASTAMANIA', 'PASTAS PASTAMANIA', 'PASTAS CONGELADAS PASTAMANIA',
  'QUE FACIL', 'QUE TAPA', 'TUTTI PASTA',
  'TA-TA',
])
function isOwnBrand(marca: string): boolean {
  return OWN_BRANDS_NORM.has(
    marca.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  )
}

const FAMILIA_ABREV: Record<string, string> = {
  'Empanadas Congeladas': 'Emp. Cong.',
  'Pastas Congeladas': 'Past. Cong.',
  'Pastas Frescas ATM': 'Past. Frescas',
  'Pizzas Congeladas': 'Pizzas C.',
}

const ESTADO_STYLE: Record<string, string> = {
  borrador: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  aprobada: 'bg-blue-100 text-blue-800 border-blue-200',
  ejecutada: 'bg-green-100 text-green-800 border-green-200',
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  aprobada: 'Aprobada',
  ejecutada: 'Ejecutada',
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function AumentoBadge({ pct }: { pct: number }) {
  const Icon = pct >= 0 ? TrendingUp : TrendingDown
  const color = pct === 0 ? 'text-gray-400' : pct > 0 ? 'text-emerald-700' : 'text-red-600'
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${color}`}>
      <Icon className="w-3 h-3" />{pctFmt(pct)}
    </span>
  )
}

function IndexBadge({ avanti, primera }: { avanti: number | null; primera: number | null }) {
  if (!avanti || !primera) return <span className="text-gray-300 text-xs">—</span>
  const idx = ((avanti - primera) / primera) * 100
  const color = idx < -15 ? 'bg-green-100 text-green-800'
    : idx < 0 ? 'bg-blue-100 text-blue-800'
    : idx < 10 ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {idx >= 0 ? '+' : ''}{idx.toFixed(0)}% vs 1ª
    </span>
  )
}

interface AvantiRowProps {
  pg: PriceGroup
  pvpPriAct: number | null
  pvpPriSim: number | null
  targetPct: number
  onSetPct: (eans: string[], val: number) => void
  onSetMbProp: (eans: string[], mb: number) => void
}

function AvantiRow({ pg, pvpPriAct, pvpPriSim, targetPct, onSetPct, onSetMbProp }: AvantiRowProps) {
  const eans = pg.skus.map(s => s.ean)
  const pvpAvSim = pg.pvpBase ? Math.round(pg.pvpBase * (1 + pg.pct / 100)) : null

  // Precio de góndola — primer SKU del grupo que tenga scraper
  const scraperPrice = pg.skus.find(s => s.pvp_scraper != null)?.pvp_scraper ?? null
  const scraperEl: ReactNode = scraperPrice
    ? <span className="tabular-nums">{fmt(scraperPrice)}</span>
    : <span className="text-gray-300">—</span>

  // Dispersión — pvpBase vs precio real en góndola
  let dispersionEl: ReactNode = <span className="text-gray-300 text-xs">—</span>
  if (pg.pvpBase && scraperPrice) {
    const d = ((scraperPrice - pg.pvpBase) / pg.pvpBase) * 100
    const abs = Math.abs(d)
    const color = abs <= 3 ? 'text-green-700 bg-green-50'
      : abs <= 8 ? 'text-yellow-700 bg-yellow-50'
      : 'text-red-700 bg-red-50'
    dispersionEl = (
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${color}`}
        title="Diferencia entre PVP góndola y PVP sugerido">
        {d >= 0 ? '+' : ''}{d.toFixed(0)}%
      </span>
    )
  }

  const mbColor = (mb: number | null) => {
    if (mb == null) return 'text-gray-400'
    if (mb >= 35) return 'text-emerald-700'
    if (mb >= 28) return 'text-blue-600'
    if (mb >= 20) return 'text-yellow-700'
    return 'text-red-600'
  }

  const own = isOwnBrand(pg.skus[0].marca)
  const rowBg = own ? 'bg-red-50/30 hover:bg-red-50/50' : 'bg-orange-50/30 hover:bg-orange-50/50'
  const marcaColor = own ? 'text-red-800' : 'text-orange-700'
  const badgeCls = own
    ? 'text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium'
    : 'text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium'

  return (
    <tr className={rowBg}>
      <td className="px-5 py-2.5">
        <div className={`font-bold text-xs ${marcaColor}`}>{pg.skus[0].marca}</div>
        {pg.skus.map(s => (
          <div key={s.ean} className="text-gray-600 text-xs mt-0.5 leading-tight">{s.descripcion}</div>
        ))}
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={badgeCls}>Propia</span>
      </td>
      {/* PVP Sugerido + MB Act. */}
      <td className="px-3 py-2.5 text-right tabular-nums">
        {pg.pvpBase
          ? <span className="font-semibold text-gray-800">{fmt(pg.pvpBase)}</span>
          : <span className="text-orange-400 text-xs">sin sugerido</span>}
        {pg.mbBase != null && (
          <div className={`text-xs font-medium mt-0.5 ${mbColor(pg.mbBase)}`}>{pg.mbBase.toFixed(1)}% MB Act.</div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-slate-500">{scraperEl}</td>
      <td className="px-2 py-2.5 text-center">{dispersionEl}</td>
      {/* % Aumento — modifica el PVP Sugerido */}
      <td className="px-3 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onSetPct(eans, Math.max(0, pg.pct - 0.5))}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">
            −
          </button>
          <input type="number" min={0} max={50} step={0.5} value={pg.pct}
            onChange={e => onSetPct(eans, parseFloat(e.target.value) || 0)}
            className="w-14 text-center px-1 py-1 border border-red-200 rounded bg-white text-red-700 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-red-400" />
          <button
            onClick={() => onSetPct(eans, pg.pct + 0.5)}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">
            +
          </button>
        </div>
      </td>
      {/* MB Prop. — modifica el Precio de Facturación (independiente del PVP) */}
      <td className="px-3 py-2.5 text-center">
        {pg.mbBase != null ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={0}
              max={80}
              step={0.5}
              value={pg.mbProp != null ? parseFloat(pg.mbProp.toFixed(1)) : ''}
              onChange={e => onSetMbProp(eans, parseFloat(e.target.value) || 0)}
              className={`w-16 text-center px-1 py-1.5 border border-blue-200 rounded bg-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 ${mbColor(pg.mbProp)}`}
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      {/* PVP Nuevo */}
      <td className="px-3 py-2.5 text-right font-bold text-emerald-800 tabular-nums">
        {fmt(pvpAvSim)}
        {pg.pvpBase && pvpAvSim && (
          <div className="flex justify-end mt-0.5">
            <AumentoBadge pct={((pvpAvSim - pg.pvpBase) / pg.pvpBase) * 100} />
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        <IndexBadge avanti={pg.pvpBase} primera={pvpPriAct} />
      </td>
      <td className="px-3 py-2.5 text-center">
        <IndexBadge avanti={pvpAvSim} primera={pvpPriSim} />
      </td>
    </tr>
  )
}

interface CompRow {
  comp: CompetidorGrupo
  compIncrease: number
  firstAvantiPvp: number | null
}

function CompetitorRow({ comp, compIncrease, firstAvantiPvp }: CompRow) {
  const pvpSim = comp.pvp_actual ? Math.round(comp.pvp_actual * (1 + compIncrease / 100)) : null
  const esPrimera = comp.segmento === 'primera'

  let posActual: ReactNode = '—'
  if (comp.pvp_actual && firstAvantiPvp) {
    const idx = ((firstAvantiPvp - comp.pvp_actual) / comp.pvp_actual) * 100
    const c = idx < 0 ? 'text-green-700' : 'text-orange-600'
    posActual = <span className={c}>{idx >= 0 ? '+' : ''}{idx.toFixed(0)}% Avanti</span>
  }

  return (
    <tr className={`hover:bg-gray-50 ${esPrimera ? 'bg-blue-50/20' : ''}`}>
      <td className="px-5 py-2.5">
        <div className={`font-semibold text-xs ${esPrimera ? 'text-blue-800' : 'text-gray-700'}`}>{comp.marca}</div>
        <div className="text-gray-400 text-xs mt-0.5 leading-tight">{comp.descripcion}</div>
      </td>
      <td className="px-3 py-2.5 text-center">
        {comp.segmento
          ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENTO_STYLE[comp.segmento] ?? 'bg-gray-100 text-gray-600'}`}>
              {SEGMENTO_LABEL[comp.segmento] ?? comp.segmento}
            </span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {comp.pvp_actual
          ? <div>
              <span className="font-semibold text-gray-800">{fmt(comp.pvp_actual)}</span>
              {comp.pvp_min !== null && comp.pvp_min < comp.pvp_actual && (
                <div className="text-orange-500 text-xs font-medium" title="Precio mínimo relevado en el período (posible oferta)">
                  oferta {fmt(comp.pvp_min)}
                </div>
              )}
            </div>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center text-gray-300 text-xs">—</td>
      <td className="px-2 py-2.5 text-center text-gray-300 text-xs">—</td>
      <td className="px-3 py-2.5 text-center text-gray-400">
        <span className="text-xs">+{compIncrease}%</span>
      </td>
      {/* MB Prop placeholder */}
      <td className="px-3 py-2.5 text-center text-gray-300 text-xs">—</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-medium">
        {fmt(pvpSim)}
        {comp.pvp_actual && pvpSim && (
          <div className="flex justify-end mt-0.5">
            <AumentoBadge pct={((pvpSim - comp.pvp_actual) / comp.pvp_actual) * 100} />
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{posActual}</td>
      <td className="px-3 py-2.5 text-center text-gray-300 text-xs">—</td>
    </tr>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SimuladorPage() {
  const [cadenas, setCadenas] = useState<string[]>([])
  const [familias, setFamilias] = useState<string[]>([])
  const [cadena, setCadena] = useState('')
  const [familiaFiltro, setFamiliaFiltro] = useState('')
  const [grupos, setGrupos] = useState<GrupoSimulador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Grupo de cadenas
  const [grupoCadena, setGrupoCadena] = useState<string | null>(null)
  const [companeras, setCompaneras] = useState<string[]>([])
  const stickyRef = useRef<HTMLDivElement>(null)
  const [stickyH, setStickyH] = useState(0)

  const [familyTargets, setFamilyTargets] = useState<Record<string, number>>({})
  const [reviewedFamilias, setReviewedFamilias] = useState<Set<string>>(new Set())
  const [compIncrease, setCompIncrease] = useState(0)
  const [skuOverrides, setSkuOverrides] = useState<Record<string, number>>({})
  const [mbPropoOverrides, setMbPropoOverrides] = useState<Record<string, number>>({})
  const [descuentosPorFamilia, setDescuentosPorFamilia] = useState<Record<string, number>>({})
  const [descuentosPorFamiliaMarca, setDescuentosPorFamiliaMarca] = useState<Record<string, Record<string, number>>>({})
  const [descGlobal, setDescGlobal] = useState(0)

  // ── Estado de simulación guardada ──────────────────────────────────────────
  const [simId, setSimId] = useState<string | null>(null)
  const [simNombre, setSimNombre] = useState('')
  const [simVigencia, setSimVigencia] = useState('')
  const [simEstado, setSimEstado] = useState('')
  const [simUsuario, setSimUsuario] = useState('')

  // ── Modales / panels ───────────────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveNombre, setSaveNombre] = useState('')
  const [saveVigencia, setSaveVigencia] = useState('')
  const [saveUsuario, setSaveUsuario] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [showLoadPanel, setShowLoadPanel] = useState(false)
  const [savedSims, setSavedSims] = useState<SimulacionListItem[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const [showEjecutarConfirm, setShowEjecutarConfirm] = useState(false)
  const [ejecutarLoading, setEjecutarLoading] = useState(false)
  const [ejecutarMsg, setEjecutarMsg] = useState('')

  // Modal replicar al grupo
  const [showReplicarModal, setShowReplicarModal] = useState(false)
  const [replicarLoading, setReplicarLoading] = useState(false)
  const [replicarResultados, setReplicarResultados] = useState<{ cadena: string; ok: boolean; actualizados: number; error?: string }[]>([])

  // ── Pending sim data (para cargar al cambiar cadena) ──────────────────────
  const pendingSimData = useRef<{
    familyTargets: Record<string, number>
    skuOverrides: Record<string, number>
    reviewedFamilias: Set<string>
  } | null>(null)

  useEffect(() => {
    fetch('/api/simulador')
      .then(r => r.json())
      .then(d => {
        setCadenas(d.cadenas ?? [])
        if (d.cadenas?.length > 0) setCadena(d.cadenas[0])
      })
  }, [])

  useEffect(() => {
    const update = () => { if (stickyRef.current) setStickyH(stickyRef.current.offsetHeight) }
    update()
    const ro = new ResizeObserver(update)
    if (stickyRef.current) ro.observe(stickyRef.current)
    return () => ro.disconnect()
  }, [grupos])

  const cargar = useCallback(async () => {
    if (!cadena) return
    setLoading(true); setError(''); setSkuOverrides({}); setMbPropoOverrides({}); setReviewedFamilias(new Set())
    try {
      const res = await fetch('/api/simulador?' + new URLSearchParams({ cadena }))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const gs: GrupoSimulador[] = data.grupos ?? []
      setGrupos(gs)
      setFamilias(data.familias ?? [])
      setGrupoCadena(data.grupoCadena ?? null)
      setCompaneras(data.companeras ?? [])
      setDescuentosPorFamilia(data.descuentosPorFamilia ?? {})
      setDescuentosPorFamiliaMarca(data.descuentosPorFamiliaMarca ?? {})
      setDescGlobal(data.descGlobal ?? 0)

      if (pendingSimData.current) {
        // Restaurar ajustes guardados; siempre usa datos frescos del monitor para gondola/competidores
        setFamilyTargets(pendingSimData.current.familyTargets)
        setSkuOverrides(pendingSimData.current.skuOverrides)
        setReviewedFamilias(pendingSimData.current.reviewedFamilias)
        pendingSimData.current = null
      } else {
        // Carga fresca sin simulación pendiente → empezar en 0% para evitar aplicar ajustes accidentalmente
        setFamilyTargets(prev => {
          const next = { ...prev }
          for (const g of gs) {
            if (!(g.familia in next)) next[g.familia] = 0
          }
          return next
        })
        setCompIncrease(0)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setLoading(false) }
  }, [cadena])

  useEffect(() => { cargar() }, [cargar])

  // ── Helpers de simulación ─────────────────────────────────────────────────

  function buildSimItems() {
    const items: {
      ean: string; familia: string; sub_familia: string; descripcion: string
      pvp_base: number | null; pct_aumento: number; pvp_nuevo: number | null; precio_neto: number
      revisado: boolean
    }[] = []
    for (const grupo of grupos) {
      const familiaRevisada = reviewedFamilias.has(grupo.familia)
      const targetPct = familyTargets[grupo.familia] ?? 3
      const priceGroups = groupAvantiByPrice(grupo.avanti, targetPct, skuOverrides, mbPropoOverrides, (descuentosPorFamilia[grupo.familia] ?? descGlobal) / 100, grupo.familia, Object.fromEntries(Object.entries(descuentosPorFamiliaMarca[grupo.familia] ?? {}).map(([m, p]) => [m.toUpperCase(), (p as number) / 100])))
      for (const pg of priceGroups) {
        const tieneOverride = pg.skus.some(s => skuOverrides[s.ean] !== undefined)
        // Aplicar cambio si: la familia fue revisada, O hay un override individual
        const aplicarCambio = familiaRevisada || tieneOverride
        const pctEfectivo = aplicarCambio ? pg.pct : 0
        const pvpNuevo = pg.pvpBase ? (aplicarCambio ? Math.round(pg.pvpBase * (1 + pg.pct / 100)) : pg.pvpBase) : null
        for (const sku of pg.skus) {
          const skuOverride = skuOverrides[sku.ean] !== undefined
          const pctFinal = skuOverride ? skuOverrides[sku.ean] : pctEfectivo
          const pvpFinal = pg.pvpBase ? (skuOverride ? Math.round(pg.pvpBase * (1 + pctFinal / 100)) : pvpNuevo) : null
          items.push({
            ean: sku.ean,
            familia: grupo.familia,
            sub_familia: grupo.subfamilia,
            descripcion: sku.descripcion,
            pvp_base: pg.pvpBase,
            pct_aumento: pctFinal ?? 0,
            pvp_nuevo: pvpFinal,
            precio_neto: sku.precio_neto,
            revisado: familiaRevisada || skuOverride,
          })
        }
      }
    }
    return items
  }

  function openSaveModal() {
    setSaveNombre(simNombre || '')
    setSaveVigencia(simVigencia || '')
    setSaveUsuario(simUsuario || '')
    setSaveError('')
    setShowSaveModal(true)
  }

  async function handleSave() {
    if (!saveNombre.trim()) { setSaveError('El nombre es requerido'); return }
    if (!saveVigencia) { setSaveError('La vigencia es requerida'); return }
    setSaveLoading(true); setSaveError('')
    try {
      const allItems = buildSimItems()
      let items: typeof allItems
      let familias_actualizar: string[] | undefined

      if (simId) {
        // Actualización parcial: solo familias revisadas + SKUs con override individual
        const itemsConCambio = allItems.filter(i => i.revisado)
        familias_actualizar = [...new Set(itemsConCambio.map(i => i.familia))]
        items = itemsConCambio
      } else {
        // Primer guardado: guardar todos (revisados con aumento, no revisados con 0%)
        items = allItems
      }
      // Quitar campo "revisado" que es solo para UI — no existe en la tabla
      const itemsPayload = items.map(({ revisado: _r, ...rest }) => rest)
      const pctGlobal = Object.values(familyTargets).length > 0
        ? Object.values(familyTargets).reduce((a, b) => a + b, 0) / Object.values(familyTargets).length
        : 3
      const payload = {
        nombre: saveNombre.trim(),
        cadena,
        vigencia_desde: saveVigencia,
        pct_global: pctGlobal,
        pct_competencia: compIncrease,
        creado_por: saveUsuario.trim() || null,
        family_targets: familyTargets,
        grupos_snapshot: grupos,
        items: itemsPayload,
        ...(familias_actualizar ? { familias_actualizar } : {}),
      }

      let res: Response
      if (simId) {
        res = await fetch(`/api/simulaciones/${simId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/simulaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (!simId) setSimId(data.id)
      setSimNombre(saveNombre.trim())
      setSimVigencia(saveVigencia)
      setSimEstado('borrador')
      setSimUsuario(saveUsuario.trim())
      setShowSaveModal(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaveLoading(false)
    }
  }

  async function fetchSavedSims() {
    setLoadingList(true)
    try {
      const res = await fetch('/api/simulaciones')
      const data = await res.json()
      setSavedSims(data.simulaciones ?? [])
    } catch { /* ignore */ } finally {
      setLoadingList(false)
    }
  }

  function openLoadPanel() {
    setShowLoadPanel(true)
    fetchSavedSims()
  }

  async function cargarSimulacion(id: string) {
    try {
      const res = await fetch(`/api/simulaciones/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const sim = data.simulacion
      const items: { ean: string; familia: string; pct_aumento: number }[] = data.items ?? []

      // Reconstruir family_targets desde los datos guardados
      const restoredFamilyTargets: Record<string, number> = sim.family_targets ?? {}

      // Reconstruir skuOverrides: pct_aumento que difiera del family target
      const restoredOverrides: Record<string, number> = {}
      for (const item of items) {
        const ft = restoredFamilyTargets[item.familia] ?? sim.pct_global ?? 3
        if (item.pct_aumento !== ft) {
          restoredOverrides[item.ean] = item.pct_aumento
        }
      }

      // Si no hay family_targets guardados, inferir del pct_global
      if (Object.keys(restoredFamilyTargets).length === 0) {
        const g = sim.pct_global ?? 3
        for (const item of items) {
          if (!(item.familia in restoredFamilyTargets)) {
            restoredFamilyTargets[item.familia] = g
          }
        }
      }

      // Reconstruir familias revisadas: las que tienen al menos 1 item con pct_aumento > 0
      const restoredReviewed = new Set<string>()
      for (const item of items) {
        if (item.pct_aumento > 0) restoredReviewed.add(item.familia)
      }

      setSimId(sim.id)
      setSimNombre(sim.nombre)
      setSimVigencia(sim.vigencia_desde)
      setSimEstado(sim.estado)
      setSimUsuario(sim.creado_por ?? '')
      setCompIncrease(sim.pct_competencia ?? 3)

      // Siempre cargar datos frescos del monitor (gondola + competidores actualizados)
      pendingSimData.current = {
        familyTargets: restoredFamilyTargets,
        skuOverrides: restoredOverrides,
        reviewedFamilias: restoredReviewed,
      }

      if (sim.cadena === cadena) {
        // Misma cadena → setCadena no dispara cargar(), forzar reload manual
        await cargar()
      } else {
        setCadena(sim.cadena)  // dispara cargar() vía useEffect
      }

      setShowLoadPanel(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cargar simulación')
    }
  }

  async function handleDeleteSim(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la simulación "${nombre}"?`)) return
    try {
      const res = await fetch(`/api/simulaciones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setSavedSims(prev => prev.filter(s => s.id !== id))
      if (simId === id) {
        setSimId(null); setSimNombre(''); setSimVigencia(''); setSimEstado(''); setSimUsuario('')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  async function handleReplicar() {
    if (!simId || !companeras.length) return
    setReplicarLoading(true)
    setReplicarResultados([])
    try {
      const res = await fetch(`/api/simulaciones/${simId}/replicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadenas_destino: companeras, vigencia_desde: simVigencia }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReplicarResultados(data.resultados ?? [])
    } catch (e) {
      setReplicarResultados([{ cadena: 'Error', ok: false, actualizados: 0, error: e instanceof Error ? e.message : 'Error' }])
    } finally {
      setReplicarLoading(false)
    }
  }

  async function handleEjecutar() {
    if (!simId) return
    setEjecutarLoading(true); setEjecutarMsg('')
    try {
      const res = await fetch(`/api/simulaciones/${simId}/ejecutar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSimEstado('ejecutada')
      setEjecutarMsg(`✓ ${data.actualizados} precios actualizados en ${cadena}`)
      setShowEjecutarConfirm(false)
    } catch (e) {
      setEjecutarMsg(e instanceof Error ? e.message : 'Error al ejecutar')
    } finally {
      setEjecutarLoading(false)
    }
  }

  // ── Helpers de presentación ────────────────────────────────────────────────

  function pvpPrimera(grupo: GrupoSimulador, simulado: boolean): number | null {
    const primer = grupo.competidores.find(c => c.segmento === 'primera')
    if (!primer?.pvp_actual) return null
    return simulado ? Math.round(primer.pvp_actual * (1 + compIncrease / 100)) : primer.pvp_actual
  }

  // Mapa EAN → familia para auto-marcar al modificar un producto
  const eanFamiliaMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const g of grupos) {
      for (const s of g.avanti) m[s.ean] = g.familia
    }
    return m
  }, [grupos])

  const handleSetPct = useCallback((eans: string[], val: number) => {
    setSkuOverrides(p => {
      const n = { ...p }
      for (const e of eans) n[e] = val
      return n
    })
    // Auto-marcar la familia como revisada cuando se modifica un producto específico
    setReviewedFamilias(prev => {
      const next = new Set(prev)
      for (const e of eans) {
        const fam = eanFamiliaMap[e]
        if (fam) next.add(fam)
      }
      return next
    })
  }, [eanFamiliaMap])

  const handleResetPct = useCallback((eans: string[]) => {
    setSkuOverrides(p => {
      const n = { ...p }
      for (const e of eans) delete n[e]
      return n
    })
  }, [])

  const handleSetMbProp = useCallback((eans: string[], mb: number) => {
    setMbPropoOverrides(p => {
      const n = { ...p }
      for (const e of eans) n[e] = mb
      return n
    })
  }, [])

  const resumenFamilias = useMemo(() => {
    const map: Record<string, { n: number; sumPct: number; objetivo: number }> = {}
    for (const g of grupos) {
      for (const sku of g.avanti) {
        const base = sku.pvp_sugerido ?? null
        if (!base) continue
        const pct = skuOverrides[sku.ean] ?? familyTargets[g.familia] ?? 3
        const pvpNuevo = Math.round(base * (1 + pct / 100))
        const pctReal = ((pvpNuevo - base) / base) * 100
        if (!map[g.familia]) map[g.familia] = { n: 0, sumPct: 0, objetivo: familyTargets[g.familia] ?? 3 }
        map[g.familia].n++
        map[g.familia].sumPct += pctReal
      }
    }
    return Object.entries(map).map(([familia, d]) => ({
      familia,
      promedio: d.n > 0 ? d.sumPct / d.n : 0,
      objetivo: d.objetivo,
      n: d.n,
    }))
  }, [grupos, familyTargets, skuOverrides])

  const agrupado = useMemo(() => {
    const familiaMap: Record<string, Record<string, GrupoSimulador[]>> = {}
    for (const g of grupos) {
      if (familiaFiltro && g.familia !== familiaFiltro) continue
      if (!familiaMap[g.familia]) familiaMap[g.familia] = {}
      if (!familiaMap[g.familia][g.subfamilia]) familiaMap[g.familia][g.subfamilia] = []
      familiaMap[g.familia][g.subfamilia].push(g)
    }
    return familiaMap
  }, [grupos, familiaFiltro])

  const familiasOrdenadas = Object.keys(agrupado).sort()
  const simItemsStats = useMemo(() => {
    const items = buildSimItems() // eslint-disable-line react-hooks/exhaustive-deps
    const revisados = items.filter(i => i.revisado).length
    return { total: items.length, revisados }
  }, [grupos, familyTargets, skuOverrides, reviewedFamilias]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-full">

      {/* ── Modal Guardar ────────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Save className="w-5 h-5 text-red-600" />
                {simId ? 'Actualizar simulación' : 'Guardar simulación'}
              </h3>
              <button onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la simulación *</label>
                <input
                  type="text"
                  value={saveNombre}
                  onChange={e => setSaveNombre(e.target.value)}
                  placeholder="Ej: Aumento mayo 2026 — Disco"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vigencia desde *</label>
                <input
                  type="date"
                  value={saveVigencia}
                  onChange={e => setSaveVigencia(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario</label>
                <input
                  type="text"
                  value={saveUsuario}
                  onChange={e => setSaveUsuario(e.target.value)}
                  placeholder="Tu nombre o iniciales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">{CADENA_FLAGS[cadena] ?? '⚪'} {cadena}</span>
                  <span>·</span>
                  <span>{simItemsStats.total} SKUs totales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-700 font-medium">{simItemsStats.revisados} SKUs con aumento</span>
                  <span className="text-gray-400">({reviewedFamilias.size} familia{reviewedFamilias.size !== 1 ? 's' : ''} revisada{reviewedFamilias.size !== 1 ? 's' : ''})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <span className="text-gray-500">{simItemsStats.total - simItemsStats.revisados} SKUs sin cambio (se guardan al precio actual)</span>
                </div>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{saveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {simId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel Cargar (lateral) ───────────────────────────────────────── */}
      {showLoadPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLoadPanel(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-red-600" />
                Simulaciones guardadas
              </h3>
              <button onClick={() => setShowLoadPanel(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingList ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : savedSims.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  No hay simulaciones guardadas
                </div>
              ) : (
                savedSims.map(sim => (
                  <div key={sim.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{sim.nombre}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">{CADENA_FLAGS[sim.cadena] ?? '⚪'} {sim.cadena}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">vigencia {fmtDate(sim.vigencia_desde)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_STYLE[sim.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {ESTADO_LABEL[sim.estado] ?? sim.estado}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          {sim.creado_por && <span>👤 {sim.creado_por}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fmtDateTime(sim.updated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => cargarSimulacion(sim.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition">
                          <FolderOpen className="w-3.5 h-3.5" />Cargar
                        </button>
                        <button
                          onClick={() => handleDeleteSim(sim.id, sim.nombre)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Replicar al grupo ──────────────────────────────────────── */}
      {showReplicarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !replicarLoading && setShowReplicarModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Copy className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Replicar al {grupoCadena}</h3>
                <p className="text-sm text-gray-500">Crea un borrador con los mismos ajustes en cada cadena del grupo</p>
              </div>
            </div>

            {replicarResultados.length === 0 ? (
              <>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Simulación base</span>
                    <span className="font-medium text-gray-800">{simNombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vigencia</span>
                    <span className="font-medium text-gray-800">{fmtDate(simVigencia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cadenas destino</span>
                    <span className="font-medium text-gray-800">
                      {companeras.map(c => `${CADENA_FLAGS[c] ?? '⚪'} ${c}`).join('  ·  ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 pt-1 border-t border-gray-200">
                    Se crearán borradores con los mismos porcentajes. Cada cadena se ejecuta por separado después de revisar.
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowReplicarModal(false)}
                    disabled={replicarLoading}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleReplicar} disabled={replicarLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
                    {replicarLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Replicando...</>
                      : <><Copy className="w-4 h-4" />Confirmar replicación</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 mb-5">
                  {replicarResultados.map(r => (
                    <div key={r.cadena} className={`flex items-center gap-3 p-3 rounded-lg ${r.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                      {r.ok
                        ? <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                        : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm ${r.ok ? 'text-emerald-800' : 'text-red-800'}`}>
                          {CADENA_FLAGS[r.cadena] ?? '⚪'} {r.cadena}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.ok ? `Borrador creado con ${r.actualizados} SKUs — revisá y ejecutá` : r.error}
                        </div>
                      </div>
                      {r.ok && (
                        <button
                          onClick={() => {
                            setShowReplicarModal(false)
                            setReplicarResultados([])
                            setSimId(null); setSimNombre(''); setSimVigencia(''); setSimEstado(''); setSimUsuario('')
                            setCadena(r.cadena)
                          }}
                          className="shrink-0 px-2.5 py-1 text-xs bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg font-medium transition">
                          Ver →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 mb-4">
                  Se crearon borradores con los mismos ajustes. Usá <strong>"Ver →"</strong> para abrir cada cadena, cargar el borrador, revisarlo y ejecutarlo cuando estés listo.
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { setShowReplicarModal(false); setReplicarResultados([]) }}
                    className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition">
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Ejecutar ───────────────────────────────────────────────── */}
      {showEjecutarConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !ejecutarLoading && setShowEjecutarConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Play className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Ejecutar simulación</h3>
                <p className="text-sm text-gray-500">Esta acción actualizará la lista de precios</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-gray-500">Simulación</span>
                <span className="font-medium text-gray-800">{simNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cadena</span>
                <span className="font-medium text-gray-800">{CADENA_FLAGS[cadena] ?? '⚪'} {cadena}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vigencia desde</span>
                <span className="font-medium text-gray-800">{fmtDate(simVigencia)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SKUs con nuevo precio</span>
                <span className="font-medium text-emerald-700">{simItemsStats.revisados}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SKUs sin cambio</span>
                <span className="font-medium text-gray-500">{simItemsStats.total - simItemsStats.revisados}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-5">
              Se escribirán los PVP nuevos en <strong>gl_lista_precios</strong>. La simulación quedará marcada como <em>Ejecutada</em> y no podrá modificarse.
            </p>

            {ejecutarMsg && (
              <div className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />{ejecutarMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEjecutarConfirm(false)}
                disabled={ejecutarLoading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">
                Cancelar
              </button>
              <button
                onClick={handleEjecutar}
                disabled={ejecutarLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
                {ejecutarLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Ejecutando...</>
                  : <><Play className="w-4 h-4" />Confirmar ejecución</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mensaje de ejecución exitosa (fuera de modal) ────────────────── */}
      {ejecutarMsg && !showEjecutarConfirm && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {ejecutarMsg}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/verificacion"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
            >
              Ir a Verificación <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button onClick={() => setEjecutarMsg('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Panel sticky principal ───────────────────────────────────────── */}
      <div ref={stickyRef} className="sticky top-0 z-30 bg-gray-50 -mx-6 px-6 pt-4 pb-3 border-b border-gray-200 shadow-sm">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-red-600" />Simulador de Actualización
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Simulá aumentos de precio por SKU y visualizá el posicionamiento resultante vs la competencia
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {/* Fila 1: controles de filtro y resumen */}
          <div className="flex flex-wrap gap-5 items-end">
            {/* Cadena */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Cadena</label>
              <div className="relative">
                <select value={cadena} onChange={e => {
                  setCadena(e.target.value)
                  // Al cambiar cadena manualmente, limpiar simulación activa y resetear ajustes
                  setSimId(null); setSimNombre(''); setSimVigencia(''); setSimEstado(''); setSimUsuario('')
                  setFamilyTargets({}); setSkuOverrides({}); setReviewedFamilias(new Set()); setCompIncrease(0)
                }}
                  className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-40">
                  {cadenas.map(c => <option key={c} value={c}>{CADENA_FLAGS[c] ?? '⚪'} {c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Familia */}
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

            {/* % aumento competencia */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">% estimado aumento competencia</label>
              <div className="flex items-center gap-2">
                {[0, 2, 3, 5].map(v => (
                  <button key={v} onClick={() => setCompIncrease(v)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${compIncrease === v ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {v}%
                  </button>
                ))}
                <input type="number" min={0} max={50} step={0.5} value={compIncrease}
                  onChange={e => setCompIncrease(parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>

            {/* Chips resumen por familia */}
            {resumenFamilias.length > 0 && (
              <div className="ml-auto flex gap-2 flex-wrap justify-end">
                {resumenFamilias.map(r => {
                  const delta = r.promedio - r.objetivo
                  const ok = Math.abs(delta) <= 0.5
                  const bg = ok ? 'bg-green-50 border-green-200'
                    : Math.abs(delta) <= 1.5 ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                  const tc = ok ? 'text-green-800'
                    : Math.abs(delta) <= 1.5 ? 'text-yellow-800'
                    : 'text-red-800'
                  const label = FAMILIA_ABREV[r.familia] ?? r.familia
                  return (
                    <div key={r.familia} className={`border rounded-lg px-2.5 py-1.5 ${bg}`} title={r.familia}>
                      <div className={`font-semibold text-xs leading-tight ${tc}`}>{label}</div>
                      <div className={`text-base font-bold leading-tight ${tc}`}>{r.promedio.toFixed(1)}%</div>
                      <div className={`text-xs ${tc} opacity-70`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Fila 2: barra de simulación */}
          <div className="border-t border-gray-100 mt-3 pt-3 flex items-center gap-3 flex-wrap">
            {/* Nombre + estado de la simulación activa */}
            {simId ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-gray-800 truncate max-w-xs">{simNombre}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${ESTADO_STYLE[simEstado] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {ESTADO_LABEL[simEstado] ?? simEstado}
                </span>
                {simVigencia && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">vigencia {fmtDate(simVigencia)}</span>
                )}
                {simUsuario && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">· {simUsuario}</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Sin simulación activa</span>
            )}

            {/* Botones */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={openLoadPanel}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition">
                <FolderOpen className="w-3.5 h-3.5" />Cargar
              </button>

              {simEstado !== 'ejecutada' && (
                <button
                  onClick={openSaveModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium transition">
                  {simId ? <Pencil className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {simId ? 'Actualizar' : 'Guardar'}
                </button>
              )}

              {simId && simEstado !== 'ejecutada' && (
                <button
                  onClick={() => { setEjecutarMsg(''); setShowEjecutarConfirm(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition">
                  <Play className="w-3.5 h-3.5" />Ejecutar
                </button>
              )}

              {simId && simEstado === 'ejecutada' && companeras.length > 0 && (
                <button
                  onClick={() => { setReplicarResultados([]); setShowReplicarModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                  title={`Replicar a ${companeras.join(', ')}`}>
                  <Copy className="w-3.5 h-3.5" />
                  Aplicar a {grupoCadena}
                </button>
              )}
            </div>
          </div>
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
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Sin datos para simular en {cadena}
        </div>
      ) : (
        <div className="space-y-6">
          {familiasOrdenadas.map(familia => {
            const subfamilias = Object.keys(agrupado[familia]).sort()
            const targetPct = familyTargets[familia] ?? 3

            return (
              <div key={familia} className="bg-white rounded-xl border border-gray-200">
                {/* Header familia sticky */}
                {(() => {
                  const revisada = reviewedFamilias.has(familia)
                  const toggleRevisada = () => setReviewedFamilias(prev => {
                    const next = new Set(prev)
                    if (next.has(familia)) next.delete(familia)
                    else next.add(familia)
                    return next
                  })
                  const markRevisada = () => setReviewedFamilias(prev => new Set([...prev, familia]))
                  return (
                    <div className={`px-5 py-3 border-b border-gray-200 flex items-center justify-between sticky z-20 rounded-t-xl transition-colors ${revisada ? 'bg-emerald-50' : 'bg-gray-50'}`}
                      style={{ top: stickyH }}>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none" title={revisada ? 'Familia incluida en la simulación' : 'Marcar familia como revisada para incluirla en la simulación'}>
                          <input
                            type="checkbox"
                            checked={revisada}
                            onChange={toggleRevisada}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          <h2 className={`font-bold text-base ${revisada ? 'text-emerald-800' : 'text-gray-900'}`}>{familia}</h2>
                        </label>
                        {revisada
                          ? <span className="text-xs text-emerald-700 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">Incluida</span>
                          : <span className="text-xs text-gray-400 italic">Sin revisar — no se guardará con aumento</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-red-500" />
                          % objetivo familia
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 5, 7].map(v => (
                            <button key={v} onClick={() => setFamilyTargets(p => ({ ...p, [familia]: v }))}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition ${targetPct === v ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {v}%
                            </button>
                          ))}
                          <input type="number" min={0} max={50} step={0.5} value={targetPct}
                            onChange={e => setFamilyTargets(p => ({ ...p, [familia]: parseFloat(e.target.value) || 0 }))}
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {subfamilias.map(subfamilia => {
                  const gruposBloque = agrupado[familia][subfamilia]
                  return (
                    <div key={subfamilia}>
                      <div className="px-5 py-2.5 bg-gray-200 border-b border-gray-300 flex items-center gap-2">
                        <span className="inline-block w-1 h-3.5 bg-red-500 rounded-full" />
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">{subfamilia}</span>
                        <span className="text-xs text-gray-600 font-medium">
                          ({gruposBloque.length} grupo{gruposBloque.length !== 1 ? 's' : ''})
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs table-fixed">
                          <colgroup>
                            <col style={{ width: '20%' }} />  {/* Marca / Descripción */}
                            <col style={{ width: '8%' }} />   {/* Segmento */}
                            <col style={{ width: '8%' }} />   {/* PVP Sugerido / MB act. */}
                            <col style={{ width: '5%' }} />   {/* Góndola */}
                            <col style={{ width: '4%' }} />   {/* Disp. */}
                            <col style={{ width: '10%' }} />  {/* % Aumento */}
                            <col style={{ width: '9%' }} />   {/* MB Prop. */}
                            <col style={{ width: '10%' }} />  {/* PVP Nuevo */}
                            <col style={{ width: '12%' }} />  {/* Pos. Actual */}
                            <col style={{ width: '7%' }} />   {/* Pos. Nueva */}
                          </colgroup>
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-100 text-gray-500">
                              <th className="text-left px-4 py-2 font-semibold">Marca / Descripción</th>
                              <th className="text-center px-2 py-2 font-semibold">Segmento</th>
                              <th className="text-right px-3 py-2 font-semibold text-gray-600">
                                <div>PVP Sugerido</div>
                                <div className="text-blue-500 font-medium text-xs normal-case">MB act.</div>
                              </th>
                              <th className="text-right px-3 py-2 font-medium text-slate-500">Góndola</th>
                              <th className="text-center px-2 py-2 font-medium text-slate-400">Disp.</th>
                              <th className="text-center px-3 py-2 font-medium text-red-600">% Aumento</th>
                              <th className="text-center px-3 py-2 font-medium text-blue-600">MB Prop.</th>
                              <th className="text-right px-3 py-2 font-medium text-emerald-700">PVP Nuevo</th>
                              <th className="text-center px-2 py-2 font-medium whitespace-nowrap">Pos. Actual</th>
                              <th className="text-center px-2 py-2 font-medium text-emerald-700 whitespace-nowrap">Pos. Nueva</th>
                            </tr>
                          </thead>
                          {gruposBloque.map((grupo, gi) => {
                            const pvpPriAct = pvpPrimera(grupo, false)
                            const pvpPriSim = pvpPrimera(grupo, true)
                            const priceGroups = groupAvantiByPrice(grupo.avanti, targetPct, skuOverrides, mbPropoOverrides, (descuentosPorFamilia[grupo.familia] ?? descGlobal) / 100, grupo.familia, Object.fromEntries(Object.entries(descuentosPorFamiliaMarca[grupo.familia] ?? {}).map(([m, p]) => [m.toUpperCase(), (p as number) / 100])))
                            const firstAvantiPvp = grupo.avanti[0]?.pvp_sugerido ?? null

                            return (
                              <tbody key={`grupo-${gi}`}>
                                {gi > 0 && (
                                  <tr>
                                    <td colSpan={10} className="border-t border-dashed border-gray-200" />
                                  </tr>
                                )}
                                {priceGroups.map((pg, pgi) => (
                                  <AvantiRow
                                    key={`av-${pgi}`}
                                    pg={pg}
                                    pvpPriAct={pvpPriAct}
                                    pvpPriSim={pvpPriSim}
                                    targetPct={targetPct}
                                    onSetPct={handleSetPct}
                                    onSetMbProp={handleSetMbProp}
                                  />
                                ))}
                                {grupo.competidores.map((comp, ci) => (
                                  <CompetitorRow
                                    key={`comp-${ci}`}
                                    comp={comp}
                                    compIncrease={compIncrease}
                                    firstAvantiPvp={firstAvantiPvp}
                                  />
                                ))}
                              </tbody>
                            )
                          })}
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
