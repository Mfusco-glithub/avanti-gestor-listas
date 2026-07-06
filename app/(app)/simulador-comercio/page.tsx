'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { TrendingUp, TrendingDown, Loader2, FileDown, Save, Play, CheckCircle2, X, AlertTriangle } from 'lucide-react'
import type { ItemSimuladorComercio, RefPrecio } from '@/app/api/simulador-comercio/route'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtN(n: number | null | undefined, dec = 0): string {
  if (n == null) return '--'
  return '$' + n.toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--'
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
}
function muColor(mu: number | null): string {
  if (mu == null) return 'text-gray-400'
  if (mu >= 40) return 'text-emerald-700 font-semibold'
  if (mu >= 25) return 'text-amber-600 font-semibold'
  return 'text-red-600 font-semibold'
}

// ─── Mark Up helpers ─────────────────────────────────────────────────────────
// MU = (PVP - C/IVA) / C/IVA × 100
// Inverso: C/IVA = PVP / (1 + MU/100)

function calcMU(pvp: number | null | undefined, civa: number | null | undefined): number | null {
  if (!pvp || !civa || civa <= 0) return null
  return Math.round((pvp - civa) / civa * 1000) / 10
}

// ─── Simulacion ──────────────────────────────────────────────────────────────
// Si muTarget != null → PVP fijo, cambia neto/civa para alcanzar ese MU.
// Si muTarget == null → aplica aumento% al neto, ajusta PVP manteniendo MU original.

function calcSim(
  item: ItemSimuladorComercio,
  aumento: number,
  muTarget: number | null,
): ItemSimuladorComercio {
  const muAct = calcMU(item.pvp_sugerido_actual, item.precio_iva_actual)

  // Modo combinado: aumento% en neto + MU objetivo fija el PVP
  if (muTarget !== null && aumento !== 0) {
    const factor    = 1 + aumento / 100
    const nuevoNeto = Math.round(item.precio_neto_actual * factor * 100) / 100
    const nuevoIva  = Math.round(nuevoNeto * (1 + item.iva_rate) * 100) / 100
    const nuevoPvp  = Math.round(nuevoIva * (1 + muTarget / 100))
    const muSim     = calcMU(nuevoPvp, nuevoIva)
    const varPct    = Math.round((nuevoNeto / item.precio_neto_actual - 1) * 1000) / 10
    return {
      ...item,
      precio_neto_sim:  nuevoNeto,
      precio_iva_sim:   nuevoIva,
      pvp_sugerido_sim: nuevoPvp,
      margen_sim:       muSim,
      var_pct:          varPct,
    }
  }

  // Modo: MU objetivo fijo, PVP sin cambio
  if (muTarget !== null && item.pvp_sugerido_actual) {
    const pvpRef  = item.pvp_sugerido_actual
    const nuevaCIva = Math.round(pvpRef / (1 + muTarget / 100) * 100) / 100
    const nuevoNeto = Math.round(nuevaCIva / (1 + item.iva_rate) * 100) / 100
    const muSim     = calcMU(pvpRef, nuevaCIva)
    const varPct    = Math.round((nuevoNeto / item.precio_neto_actual - 1) * 1000) / 10
    return {
      ...item,
      precio_neto_sim:  nuevoNeto,
      precio_iva_sim:   nuevaCIva,
      pvp_sugerido_sim: pvpRef,
      margen_sim:       muSim,
      var_pct:          varPct,
    }
  }

  // Sin aumento
  if (aumento === 0) {
    return {
      ...item,
      precio_neto_sim:  item.precio_neto_actual,
      precio_iva_sim:   item.precio_iva_actual,
      pvp_sugerido_sim: item.pvp_sugerido_actual,
      margen_sim:       muAct,
      var_pct:          null,
    }
  }

  // Modo: aumento% → mantiene MU original
  const factor    = 1 + aumento / 100
  const nuevoNeto = Math.round(item.precio_neto_actual * factor * 100) / 100
  const nuevoIva  = Math.round(nuevoNeto * (1 + item.iva_rate) * 100) / 100
  let nuevoPvp: number | null = null
  if (muAct !== null) {
    nuevoPvp = Math.round(nuevoIva * (1 + muAct / 100))
  } else if (item.pvp_sugerido_actual) {
    nuevoPvp = Math.round(item.pvp_sugerido_actual * factor)
  }
  const muSim  = calcMU(nuevoPvp, nuevoIva)
  const varPct = Math.round((nuevoNeto / item.precio_neto_actual - 1) * 1000) / 10
  return {
    ...item,
    precio_neto_sim:  nuevoNeto,
    precio_iva_sim:   nuevoIva,
    pvp_sugerido_sim: nuevoPvp,
    margen_sim:       muSim,
    var_pct:          varPct,
  }
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const PCT_PRESETS = [1, 2, 3, 5, 7]

const FUENTE_COLORS: Record<string, string> = {
  'LA ESPECIALISTA': 'bg-sky-50 border-sky-200 text-sky-800',
  '5 ESTRELLAS':     'bg-violet-50 border-violet-200 text-violet-800',
  'MARCELLO':        'bg-gray-50 border-gray-200 text-gray-600',
}
const FUENTE_LABEL: Record<string, string> = {
  'LA ESPECIALISTA': 'La Especialista',
  '5 ESTRELLAS':     '5 Estrellas',
  'MARCELLO':        'Marcello',
}
const SEGMENTO_BADGE: Record<string, string> = {
  primera:     'bg-blue-100 text-blue-700 border-blue-200',
  segunda:     'bg-green-100 text-green-700 border-green-200',
  marca_propia:'bg-orange-100 text-orange-700 border-orange-200',
  value:       'bg-gray-100 text-gray-600 border-gray-200',
}
const SEGMENTO_LABEL: Record<string, string> = {
  primera: '1ª', segunda: '2ª', marca_propia: 'MP', value: 'VAL',
}

// ─── PVP Comp: promedio de refs visibles ─────────────────────────────────────

function pvpCompRef(refs: RefPrecio[], fuentesFiltro: string[], compInc: number = 0): number | null {
  const visibles = fuentesFiltro.length === 0
    ? refs
    : refs.filter(r => fuentesFiltro.includes(r.fuente))
  // Comparar contra el PVP de la lista comercial del competidor, con aumento aplicado
  const pvps = visibles
    .map(r => r.pvp_sugerido
      ? Math.round(r.pvp_sugerido * (1 + compInc / 100))
      : null)
    .filter((p): p is number => p != null && p > 0)
  if (!pvps.length) return null
  return Math.round(pvps.reduce((a, b) => a + b, 0) / pvps.length)
}

// ─── Fila de un producto ─────────────────────────────────────────────────────
// Columnas (9): Descripción | c/IVA Act. | PVP Act. | MU Act. | Aum.% |
//               c/IVA Nuevo | PVP Nuevo | PVP Comp | MU Prop.

interface ItemFilaProps {
  item:            ItemSimuladorComercio
  aum:             number
  muOverride:      string
  fuentesFiltro:   string[]
  compIncrease:    number
  onAumentoChange: (ean: string, v: number) => void
  onMuChange:      (ean: string, v: string) => void
}

function ItemFila({ item, aum, muOverride, fuentesFiltro, compIncrease, onAumentoChange, onMuChange }: ItemFilaProps) {
  const muAct = calcMU(item.pvp_sugerido_actual, item.precio_iva_actual)

  // ¿Está activo el modo MU?
  const isMuMode = muOverride !== '' && !isNaN(parseFloat(muOverride))

  // c/IVA NUEVO: solo muestra % cuando hay override de MU activo
  const civaChg = isMuMode && item.precio_iva_actual && item.precio_iva_sim !== item.precio_iva_actual
    ? Math.round((item.precio_iva_sim / item.precio_iva_actual - 1) * 1000) / 10
    : null

  // PVP NUEVO:
  //   aumento puro   → var_pct (evita discrepancia por redondeo del PVP entero)
  //   modo combinado → % real del nuevo PVP vs actual
  //   MU puro        → null (PVP no cambió)
  const isAumMode = aum !== 0
  const pvpIndicator = !isMuMode
    ? item.var_pct
    : (isAumMode && item.pvp_sugerido_sim != null && item.pvp_sugerido_actual != null
        ? Math.round((item.pvp_sugerido_sim / item.pvp_sugerido_actual - 1) * 1000) / 10
        : null)

  const pvpComp = pvpCompRef(item.refs, fuentesFiltro, compIncrease)
  const pvpVsComp = pvpComp && item.pvp_sugerido_sim
    ? Math.round((item.pvp_sugerido_sim / pvpComp - 1) * 1000) / 10
    : null

  const muActCls = 'px-2 py-2 text-right text-xs ' + muColor(muAct)

  const chgColor = (v: number | null) =>
    v == null ? '' : v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-500' : 'text-gray-400'

  // pvpVsComp: positive = nuestro PVP mayor a competencia = malo
  const compColor = pvpVsComp == null ? '' : pvpVsComp > 0 ? 'text-red-500' : 'text-emerald-600'

  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/30 transition">
      <td className="px-3 py-2 max-w-[295px]">
        <span className="font-medium text-gray-900 text-sm truncate block" title={item.descripcion}>{item.descripcion}</span>
      </td>
      <td className="px-2 py-2 text-right font-mono text-gray-600 text-sm">
        {fmtN(item.precio_iva_actual, 2)}
      </td>
      <td className="px-2 py-2 text-right font-mono text-gray-700 text-sm font-semibold">
        {fmtN(item.pvp_sugerido_actual, 0)}
      </td>
      <td className={muActCls}>
        {muAct != null ? muAct.toFixed(1) + '%' : '--'}
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          step="0.5"
          value={aum === 0 ? '' : aum}
          onChange={e => {
            const v = parseFloat(e.target.value)
            onAumentoChange(item.ean, isNaN(v) ? 0 : v)
          }}
          placeholder="0%"
          className="w-16 px-1.5 py-0.5 border rounded text-right text-xs"
        />
      </td>
      <td className="px-2 py-2 text-right font-mono bg-blue-50 text-blue-700 text-sm whitespace-nowrap">
        {fmtN(item.precio_iva_sim, 2)}
        {civaChg != null && (
          <span className={'ml-1 text-[10px] ' + chgColor(civaChg)}>
            {civaChg > 0 ? <TrendingUp className="inline w-3 h-3" /> : <TrendingDown className="inline w-3 h-3" />}
            {fmtPct(civaChg)}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-right font-mono bg-blue-50 text-gray-800 font-semibold text-sm whitespace-nowrap">
        {fmtN(item.pvp_sugerido_sim, 0)}
        {pvpIndicator != null && (
          <span className={'ml-1 text-[10px] font-semibold ' + chgColor(pvpIndicator)}>
            {fmtPct(pvpIndicator)}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm bg-orange-50 whitespace-nowrap">
        {pvpComp ? (
          <span>
            {fmtN(pvpComp, 0)}
            {pvpVsComp != null && (
              <span className={'ml-1 text-[10px] font-semibold ' + compColor}>
                {fmtPct(pvpVsComp)}
              </span>
            )}
          </span>
        ) : <span className="text-gray-300">--</span>}
      </td>
      <td className="px-2 py-2 bg-blue-50 whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            step="0.5"
            value={muOverride}
            onChange={e => onMuChange(item.ean, e.target.value)}
            placeholder={isMuMode && item.margen_sim != null ? item.margen_sim.toFixed(1) : (muAct != null ? muAct.toFixed(1) : '--')}
            className="w-14 px-1.5 py-0.5 border rounded text-right text-xs"
          />
          <span className={'text-xs font-semibold ' + muColor(item.margen_sim)}>%</span>
        </div>
      </td>
    </tr>
  )
}

// ─── Fila de competidor ───────────────────────────────────────────────────────

function CompetidorGrupoFila({ comp: r, pvpNuestro, compIncrease }: { comp: RefPrecio; pvpNuestro: number | null; compIncrease: number }) {
  const isManual     = r.precio_iva !== null  // refs manuales tienen precio_iva; pm no
  const colorClasses = FUENTE_COLORS[r.fuente] ?? (isManual
    ? 'bg-gray-50 border-gray-200 text-gray-600'
    : 'bg-amber-50 border-amber-200 text-amber-800')
  const label        = FUENTE_LABEL[r.fuente] ?? r.fuente
  const rowBg        = colorClasses.split(' ')[0]
  const muComp       = calcMU(r.pvp_sugerido, r.precio_iva)
  // PVP ajustado con aumento estimado de la competencia
  const pvpAjustado  = r.pvp_sugerido && compIncrease !== 0
    ? Math.round(r.pvp_sugerido * (1 + compIncrease / 100))
    : r.pvp_sugerido
  // Comparar nuestro PVP simulado vs el PVP ajustado del competidor
  const diffVsNuestro = pvpNuestro && pvpAjustado && pvpAjustado > 0
    ? Math.round((pvpNuestro / pvpAjustado - 1) * 1000) / 10
    : null
  const diffColor    = diffVsNuestro == null ? '' : diffVsNuestro > 0 ? 'text-red-500' : 'text-emerald-600'
  const segBadge     = r.segmento ? SEGMENTO_BADGE[r.segmento] : null
  const segLabel     = r.segmento ? SEGMENTO_LABEL[r.segmento] : null

  return (
    <tr className={'border-b border-opacity-40 text-xs ' + rowBg}>
      <td className="pl-10 pr-2 py-1.5">
        <div className="flex items-center gap-1.5">
          {segBadge && segLabel && (
            <span className={'inline-block px-1 py-0.5 rounded text-[9px] font-bold border ' + segBadge}>
              {segLabel}
            </span>
          )}
          <span className={'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ' + colorClasses}>
            {label}
          </span>
          <span className="text-gray-600 truncate max-w-xs">{r.descripcion}</span>
          {r.gramaje && <span className="text-gray-400 shrink-0">{r.gramaje}</span>}
          {!isManual && (
            <span className="text-[9px] text-amber-500 font-medium shrink-0">retail</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-gray-500">
        {r.precio_iva !== null ? fmtN(r.precio_iva, 2) : <span className="text-gray-300">--</span>}
      </td>
      <td className="px-2 py-1.5 text-right font-mono">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-gray-700 font-semibold">
            {r.pvp_sugerido ? fmtN(r.pvp_sugerido, 0) : '--'}
          </span>
          {compIncrease !== 0 && r.pvp_sugerido && pvpAjustado && (
            <span className="text-[9px] text-orange-500 font-medium whitespace-nowrap">
              +{compIncrease}% → {fmtN(pvpAjustado, 0)}
            </span>
          )}
          {r.pvp_retail != null && (
            <span className="text-[9px] text-amber-600 font-medium whitespace-nowrap">
              🏪 {fmtN(r.pvp_retail, 0)}
            </span>
          )}
        </div>
      </td>
      <td className={'px-2 py-1.5 text-right text-xs ' + muColor(muComp)}>
        {muComp != null ? muComp.toFixed(1) + '%' : <span className="text-gray-300">--</span>}
      </td>
      <td className="px-2 py-1.5" />
      <td className="px-2 py-1.5 bg-blue-50" />
      <td className="px-2 py-1.5 bg-blue-50" />
      <td className="px-2 py-1.5 text-right bg-orange-50">
        {diffVsNuestro != null
          ? <span className={'text-xs font-semibold ' + diffColor}>{fmtPct(diffVsNuestro)}</span>
          : <span className="text-gray-300 text-xs">--</span>}
      </td>
      <td className="px-2 py-1.5 bg-blue-50" />
    </tr>
  )
}

// ─── Bloque familia (header con chips + marcas + subfamilias) ────────────────
// Estructura: Familia → Marca → Subfamilia → items + refs

interface SubGroup   { subfamilia: string; items: ItemSimuladorComercio[]; refs: RefPrecio[] }
interface MarcaInFam { marca: string; subfamilias: SubGroup[] }

interface FamiliaBlockProps {
  familia:              string
  marcas:               MarcaInFam[]
  fuentesFiltro:        string[]
  aumentos:             Record<string, number>
  muOverrides:          Record<string, string>
  compIncreaseEfectivo: number
  onAumentoChange:      (ean: string, v: number) => void
  onMuChange:           (ean: string, v: string) => void
  onAplicarFamilia:     (familia: string, pct: number) => void
  onSetCompIncrease:    (familia: string, pct: number) => void
}

function FamiliaBlock({
  familia, marcas,
  fuentesFiltro, aumentos, muOverrides,
  compIncreaseEfectivo,
  onAumentoChange, onMuChange, onAplicarFamilia, onSetCompIncrease,
}: FamiliaBlockProps) {
  const [customPct, setCustomPct] = useState('')
  const [compCustomPct, setCompCustomPct] = useState('')

  const aplicarCustom = () => {
    const v = parseFloat(customPct)
    if (!isNaN(v)) { onAplicarFamilia(familia, v); setCustomPct('') }
  }
  const aplicarCompCustom = () => {
    const v = parseFloat(compCustomPct)
    if (!isNaN(v)) { onSetCompIncrease(familia, v); setCompCustomPct('') }
  }

  return (
    <Fragment>
      {/* ── Header familia con chips ── */}
      <tr className="border-b border-gray-300 bg-gray-200">
        <td className="px-4 py-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider" colSpan={4}>
          {familia}
        </td>
        <td className="px-2 py-1" colSpan={5}>
          <div className="flex items-center gap-1 justify-end flex-wrap">
            {/* Chips AVANTI */}
            {PCT_PRESETS.map(pct => (
              <button
                key={pct}
                onClick={() => onAplicarFamilia(familia, pct)}
                className="px-2 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition text-gray-600 font-semibold"
              >
                +{pct}%
              </button>
            ))}
            <input
              type="number" step="0.5"
              value={customPct}
              onChange={e => setCustomPct(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') aplicarCustom() }}
              placeholder="%"
              className="w-12 px-1 py-0.5 text-[10px] border rounded text-right"
            />
            <button
              onClick={aplicarCustom}
              className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              →
            </button>

            {/* Separador */}
            <div className="h-4 w-px bg-gray-400 mx-1" />

            {/* Chips Competencia */}
            <span className="text-[10px] font-semibold text-orange-500 whitespace-nowrap">Comp.:</span>
            {[0, 2, 3, 5].map(pct => (
              <button
                key={'c' + pct}
                onClick={() => onSetCompIncrease(familia, pct)}
                className={
                  'px-2 py-0.5 text-[10px] border rounded transition font-semibold ' +
                  (compIncreaseEfectivo === pct
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700')
                }
              >
                +{pct}%
              </button>
            ))}
            <input
              type="number" step="0.5"
              value={compCustomPct}
              onChange={e => setCompCustomPct(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') aplicarCompCustom() }}
              placeholder="%"
              className="w-10 px-1 py-0.5 text-[10px] border rounded text-right"
            />
            <button
              onClick={aplicarCompCustom}
              className="px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold"
            >
              →
            </button>
          </div>
        </td>
      </tr>

      {marcas.map(({ marca, subfamilias }) => (
        <Fragment key={marca}>
          {/* ── Header marca ── */}
          <tr>
            <td colSpan={9} className="px-5 py-1.5 bg-gray-700 text-white text-xs font-bold uppercase tracking-widest">
              {marca}
            </td>
          </tr>

          {subfamilias.map(sg => (
            <Fragment key={sg.subfamilia}>
              {/* ── Header subfamilia ── */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <td colSpan={9} className="px-6 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {sg.subfamilia}
                </td>
              </tr>

              {/* ── Productos ── */}
              {sg.items.map(item => (
                <ItemFila
                  key={item.ean}
                  item={item}
                  aum={aumentos[item.ean] ?? 0}
                  muOverride={muOverrides[item.ean] ?? ''}
                  fuentesFiltro={fuentesFiltro}
                  compIncrease={compIncreaseEfectivo}
                  onAumentoChange={onAumentoChange}
                  onMuChange={onMuChange}
                />
              ))}

              {/* ── Separador competencia ── */}
              {sg.refs.filter(r => fuentesFiltro.length === 0 || fuentesFiltro.includes(r.fuente)).length > 0 && (
                <tr className="border-t border-dashed border-orange-200 bg-orange-50/40">
                  <td colSpan={9} className="px-6 py-0.5">
                    <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
                      Competencia
                    </span>
                  </td>
                </tr>
              )}

              {/* ── Filas de competencia ── */}
              {sg.refs
                .filter(r => fuentesFiltro.length === 0 || fuentesFiltro.includes(r.fuente))
                .map((r, i) => {
                  const pvpGrupo = sg.items.length > 0 ? sg.items[0].pvp_sugerido_sim : null
                  return (
                    <CompetidorGrupoFila
                      key={'comp-' + i}
                      comp={r}
                      pvpNuestro={pvpGrupo}
                      compIncrease={compIncreaseEfectivo}
                    />
                  )
                })}
            </Fragment>
          ))}
        </Fragment>
      ))}
    </Fragment>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function SimuladorComercioPage() {
  const [cadenas, setCadenas]     = useState<string[]>([])
  const [cadena, setCadena]       = useState('')
  const [familias, setFamilias]   = useState<string[]>([])
  const [familiaFiltro, setFamiliaFiltro] = useState('')
  const [fuentes, setFuentes]     = useState<string[]>([])
  const [fuentesFiltro, setFuentesFiltro] = useState<string[]>([])
  const [items, setItems]         = useState<ItemSimuladorComercio[]>([])
  const [aumentos, setAumentos]   = useState<Record<string, number>>({})
  const [muOverrides, setMuOverrides] = useState<Record<string, string>>({})
  const [globalPct, setGlobalPct] = useState('')
  const [compIncrease, setCompIncrease] = useState(0)
  const [compIncreasePerFam, setCompIncreasePerFam] = useState<Record<string, number>>({})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [descargando, setDescargando] = useState(false)

  // ── Estado simulación guardada ─────────────────────────────────────────────
  const [simId, setSimId] = useState<string | null>(null)
  const [simNombre, setSimNombre] = useState('')
  const [simVigencia, setSimVigencia] = useState('')
  const [simEstado, setSimEstado] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveNombre, setSaveNombre] = useState('')
  const [saveVigencia, setSaveVigencia] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showEjecutarConfirm, setShowEjecutarConfirm] = useState(false)
  const [ejecutarLoading, setEjecutarLoading] = useState(false)
  const [ejecutarMsg, setEjecutarMsg] = useState('')

  useEffect(() => {
    fetch('/api/simulador-comercio', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const lista: string[] = d.cadenas ?? []
        setCadenas(lista)
        if (lista.length > 0) setCadena(lista[0])
      })
  }, [])

  const cargar = useCallback(async () => {
    if (!cadena) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/simulador-comercio?cadena=' + cadena, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items ?? [])
      setFamilias(data.familias ?? [])
      setFuentes(data.fuentes ?? [])
      setFuentesFiltro([]); setAumentos({}); setMuOverrides({}); setGlobalPct('')
      setCompIncrease(0); setCompIncreasePerFam({})
      setSimId(null); setSimNombre(''); setSimVigencia(''); setSimEstado(''); setEjecutarMsg('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [cadena])

  useEffect(() => { cargar() }, [cargar])

  const aplicarGlobal = useCallback((pct: number) => {
    const map: Record<string, number> = {}
    for (const item of items) map[item.ean] = pct
    setAumentos(map)
    setMuOverrides({})   // chip global = modo aumento puro (reset MU)
  }, [items])

  const aplicarFamilia = useCallback((fam: string, pct: number) => {
    setAumentos(prev => {
      const map = { ...prev }
      for (const item of items) if (item.familia === fam) map[item.ean] = pct
      return map
    })
    setMuOverrides(prev => {    // chip familia = modo aumento puro para esa familia
      const map = { ...prev }
      for (const item of items) if (item.familia === fam) delete map[item.ean]
      return map
    })
  }, [items])

  const onAumentoChange = useCallback((ean: string, v: number) => {
    setAumentos(prev => ({ ...prev, [ean]: v }))
    // Aumento y MU coexisten; no borramos muOverride
  }, [])

  const onMuChange = useCallback((ean: string, v: string) => {
    setMuOverrides(prev => ({ ...prev, [ean]: v }))
    // Aumento y MU coexisten; no reseteamos aumento
  }, [])

  // Simular items
  const itemsSim = items.map(item => {
    const muStr = muOverrides[item.ean]
    const muVal = muStr !== undefined && muStr !== '' ? parseFloat(muStr) : null
    return calcSim(item, aumentos[item.ean] ?? 0, isNaN(muVal ?? NaN) ? null : muVal)
  })

  const itemsFiltrados = itemsSim.filter(item =>
    !familiaFiltro || item.familia === familiaFiltro
  )

  // Agrupar: Familia → Marca → Subfamilia
  interface SubGroup   { subfamilia: string; items: ItemSimuladorComercio[]; refs: RefPrecio[] }
  interface MarcaInFam { marca: string; subfamilias: SubGroup[] }
  interface FamGroup   { familia: string; marcas: MarcaInFam[] }

  const famGroups: FamGroup[] = []
  const famIdx = new Map<string, number>()
  const marcasIdx = new Map<string, Map<string, number>>()
  const subsIdx   = new Map<string, Map<string, number>>()

  for (const item of itemsFiltrados) {
    if (!famIdx.has(item.familia)) {
      famIdx.set(item.familia, famGroups.length)
      marcasIdx.set(item.familia, new Map())
      famGroups.push({ familia: item.familia, marcas: [] })
    }
    const fi = famIdx.get(item.familia)!
    const fg = famGroups[fi]
    const marcasInFam = marcasIdx.get(item.familia)!

    if (!marcasInFam.has(item.marca)) {
      marcasInFam.set(item.marca, fg.marcas.length)
      const fmKey = item.familia + '||' + item.marca
      subsIdx.set(fmKey, new Map())
      fg.marcas.push({ marca: item.marca, subfamilias: [] })
    }
    const mi   = marcasInFam.get(item.marca)!
    const mg   = fg.marcas[mi]
    const fmKey = item.familia + '||' + item.marca
    const subsInMarca = subsIdx.get(fmKey)!

    if (!subsInMarca.has(item.subfamilia)) {
      subsInMarca.set(item.subfamilia, mg.subfamilias.length)
      mg.subfamilias.push({ subfamilia: item.subfamilia, items: [], refs: [] })
    }
    const sg = mg.subfamilias[subsInMarca.get(item.subfamilia)!]
    sg.items.push(item)
    // Acumular refs únicas (por fuente+descripcion) de todos los items del subfamilia
    for (const ref of item.refs) {
      const key = ref.fuente + '||' + ref.descripcion
      if (!sg.refs.some(r => r.fuente + '||' + r.descripcion === key)) {
        sg.refs.push(ref)
      }
    }
  }

  // ── Guardar simulación como borrador ──────────────────────────────────────
  const handleGuardar = async () => {
    if (!saveNombre.trim()) { setSaveError('El nombre es requerido'); return }
    if (!saveVigencia) { setSaveError('La vigencia es requerida'); return }
    setSaveLoading(true); setSaveError('')
    try {
      const payload = {
        nombre: saveNombre.trim(),
        cadena,
        vigencia_desde: saveVigencia,
        items: itemsSim.map(i => ({
          ean:                  i.ean,
          familia:              i.familia,
          subfamilia:           i.subfamilia,
          descripcion:          i.descripcion,
          pvp_sugerido_actual:  i.pvp_sugerido_actual,
          pvp_sugerido_sim:     i.pvp_sugerido_sim,
          precio_neto_actual:   i.precio_neto_actual,
          precio_neto_sim:      i.precio_neto_sim,
          var_pct:              i.var_pct,
        })),
      }
      const res = await fetch('/api/simulador-comercio/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSimId(data.id)
      setSimNombre(saveNombre.trim())
      setSimVigencia(saveVigencia)
      setSimEstado('borrador')
      setShowSaveModal(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaveLoading(false)
    }
  }

  // ── Ejecutar simulación → escribe en gl_lista_precios ──────────────────────
  const handleEjecutar = async () => {
    if (!simId) return
    setEjecutarLoading(true); setEjecutarMsg('')
    try {
      const res = await fetch(`/api/simulador-comercio/ejecutar/${simId}`, { method: 'POST' })
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

  // Generar lista xlsx
  const generarLista = async () => {
    setDescargando(true)
    try {
      const payload = itemsSim.map(i => ({
        ean: i.ean, precio_neto: i.precio_neto_sim, pvp_sugerido: i.pvp_sugerido_sim,
      }))
      const res = await fetch('/api/simulador-comercio/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadena, items: payload }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const blob = await res.blob()
      const cd   = res.headers.get('Content-Disposition') ?? ''
      const filename = cd.match(/filename="([^"]+)"/)?.[1] ?? 'simulacion-' + cadena.toLowerCase() + '.xlsx'
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Modal Guardar ────────────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Save className="w-5 h-5 text-blue-600" />
                Guardar simulación
              </h3>
              <button onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={saveNombre}
                  onChange={e => setSaveNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGuardar() }}
                  placeholder={`Ej: Aumento junio 2026 — ${cadena}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vigencia desde *</label>
                <input
                  type="date"
                  value={saveVigencia}
                  onChange={e => setSaveVigencia(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                <div className="font-medium text-gray-700">{cadena} · {itemsSim.length} SKUs</div>
                <div>Se guarda como borrador. Luego podés Ejecutar para aplicar los precios.</div>
              </div>
              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{saveError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button
                onClick={handleGuardar}
                disabled={saveLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ejecutar ───────────────────────────────────────────────────── */}
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
                <p className="text-sm text-gray-500">Escribe los precios en gl_lista_precios</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-gray-500">Simulación</span>
                <span className="font-medium text-gray-800">{simNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cadena</span>
                <span className="font-medium text-gray-800">{cadena}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vigencia desde</span>
                <span className="font-medium text-gray-800">{simVigencia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SKUs a actualizar</span>
                <span className="font-medium text-emerald-700">{itemsSim.length}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Se escribirán los precios simulados en <strong>gl_lista_precios</strong> con la vigencia indicada.
              La simulación quedará marcada como <em>Ejecutada</em>.
            </p>
            {ejecutarMsg && (
              <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />{ejecutarMsg}
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

      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Simulador Comercio / Interior / PedidosYa</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Simula aumentos y compara con precios de la competencia
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {cadenas.map(c => (
              <button
                key={c}
                onClick={() => setCadena(c)}
                className={
                  'px-4 py-1.5 rounded-full text-sm font-medium border transition ' +
                  (cadena === c
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400')
                }
              >
                {c === 'PEDIDOSYA' ? 'PedidosYa' : c}
              </button>
            ))}
            <button
              onClick={generarLista}
              disabled={descargando || items.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              {descargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Generar lista
            </button>
            {simEstado !== 'ejecutada' && (
              <button
                onClick={() => { setSaveNombre(simNombre); setSaveVigencia(simVigencia); setSaveError(''); setShowSaveModal(true) }}
                disabled={items.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 rounded-lg text-sm font-medium transition"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            )}
            {simId && simEstado !== 'ejecutada' && (
              <button
                onClick={() => { setEjecutarMsg(''); setShowEjecutarConfirm(true) }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Play className="w-4 h-4" />
                Ejecutar
              </button>
            )}
          </div>
        </div>

        {/* ── Barra de estado de simulación ── */}
        {(simId || ejecutarMsg) && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {simId && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{simNombre}</span>
                <span className={
                  'text-xs px-2 py-0.5 rounded-full border font-medium ' +
                  (simEstado === 'ejecutada' ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-200')
                }>
                  {simEstado === 'ejecutada' ? 'Ejecutada' : 'Borrador'}
                </span>
                {simVigencia && (
                  <span className="text-xs text-gray-400">vigencia {simVigencia}</span>
                )}
              </div>
            )}
            {ejecutarMsg && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {ejecutarMsg}
                <button onClick={() => setEjecutarMsg('')} className="ml-1 text-emerald-400 hover:text-emerald-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <Fragment>

          {/* ── Barra de controles ── */}
          <div className="bg-white border-b px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

              {/* Global chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Global:</span>
                {PCT_PRESETS.map(pct => (
                  <button
                    key={pct}
                    onClick={() => aplicarGlobal(pct)}
                    className="px-2 py-0.5 text-xs bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition text-gray-600 font-medium"
                  >
                    +{pct}%
                  </button>
                ))}
                <input
                  type="number" step="0.5"
                  value={globalPct}
                  onChange={e => setGlobalPct(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(globalPct); if (!isNaN(v)) aplicarGlobal(v) } }}
                  placeholder="%"
                  className="w-16 px-1.5 py-0.5 border rounded text-xs text-right"
                />
                <button
                  onClick={() => { const v = parseFloat(globalPct); if (!isNaN(v)) aplicarGlobal(v) }}
                  className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >→</button>
                <button
                  onClick={() => { setAumentos({}); setMuOverrides({}); setGlobalPct(''); setCompIncrease(0); setCompIncreasePerFam({}) }}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >× Reset</button>
              </div>

              {/* Aumento competencia global */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="h-5 w-px bg-gray-200 mr-1" />
                <span className="text-xs font-medium text-orange-500 whitespace-nowrap">Comp. +%:</span>
                {[0, 2, 3, 5].map(pct => (
                  <button
                    key={pct}
                    onClick={() => { setCompIncrease(pct); setCompIncreasePerFam({}) }}
                    className={
                      'px-2 py-0.5 text-xs rounded border transition font-medium ' +
                      (compIncrease === pct && Object.keys(compIncreasePerFam).length === 0
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700')
                    }
                  >
                    +{pct}%
                  </button>
                ))}
                <input
                  type="number" step="0.5"
                  value={compIncrease === 0 && Object.keys(compIncreasePerFam).length === 0 ? '' : compIncrease}
                  onChange={e => { const v = parseFloat(e.target.value); setCompIncrease(isNaN(v) ? 0 : v); setCompIncreasePerFam({}) }}
                  placeholder="%"
                  className="w-14 px-1.5 py-0.5 border rounded text-xs text-right"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {/* Filtro familia */}
                <select
                  value={familiaFiltro}
                  onChange={e => setFamiliaFiltro(e.target.value)}
                  className="px-2 py-1 border rounded text-xs text-gray-700"
                >
                  <option value="">Todas las familias</option>
                  {familias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                {/* Filtro fuentes */}
                {fuentes.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Comp.:</span>
                    {fuentes.map(f => (
                      <button
                        key={f}
                        onClick={() => setFuentesFiltro(prev =>
                          prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
                        )}
                        className={
                          'px-2 py-0.5 text-xs rounded border transition ' +
                          (fuentesFiltro.length === 0 || fuentesFiltro.includes(f)
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : 'bg-gray-50 text-gray-400 border-gray-200')
                        }
                      >
                        {FUENTE_LABEL[f] ?? f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Tabla ── */}
          <div className="px-6 py-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2 rounded-tl-lg w-[295px]">Descripción</th>
                  <th className="text-right px-2 py-2 w-28">c/IVA Act.</th>
                  <th className="text-right px-2 py-2 w-24">PVP Act.</th>
                  <th className="text-right px-2 py-2 w-20">MU Act.</th>
                  <th className="text-center px-2 py-2 w-20">Aum. %</th>
                  <th className="text-right px-2 py-2 w-36 bg-blue-50">c/IVA Nuevo</th>
                  <th className="text-right px-2 py-2 w-28 bg-blue-50">PVP Nuevo</th>
                  <th className="text-right px-2 py-2 w-28 bg-orange-50">PVP Comp.</th>
                  <th className="text-right px-2 py-2 w-24 bg-blue-50 rounded-tr-lg">MU Prop.</th>
                </tr>
              </thead>
              <tbody>
                {famGroups.map(fg => (
                  <FamiliaBlock
                    key={fg.familia}
                    familia={fg.familia}
                    marcas={fg.marcas}
                    fuentesFiltro={fuentesFiltro}
                    aumentos={aumentos}
                    muOverrides={muOverrides}
                    compIncreaseEfectivo={compIncreasePerFam[fg.familia] ?? compIncrease}
                    onAumentoChange={onAumentoChange}
                    onMuChange={onMuChange}
                    onAplicarFamilia={aplicarFamilia}
                    onSetCompIncrease={(fam, pct) => setCompIncreasePerFam(prev => ({ ...prev, [fam]: pct }))}
                  />
                ))}
              </tbody>
            </table>

            {itemsFiltrados.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-400">Sin datos para esta selección</div>
            )}
          </div>

        </Fragment>
      )}
    </div>
  )
}
