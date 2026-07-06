import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

const PM_CADENA_MAP: Record<string, string> = {
  DISCO: 'Disco', DEVOTO: 'Devoto', GEANT: 'Geant',
  TATA: 'Ta-Ta', TIENDA: 'Tienda Inglesa', MACRO: '',
}

// Marcas propias de la empresa (normalizadas sin acentos, mayúsculas)
const OWN_BRANDS_NORM = new Set([
  'AVANTI', 'PASTAS AVANTI', 'EMPANADAS CONGELADAS AVANTI',
  'PIZZAS CONGELADAS AVANTI', 'SALSAS AVANTI',
  'PASTAMANIA', 'PASTAS PASTAMANIA', 'PASTAS CONGELADAS PASTAMANIA',
  'QUE FACIL', 'QUE TAPA', 'TUTTI PASTA',
  'TA-TA',
  'CEFA',
])

function isOwnBrand(marca: string): boolean {
  const norm = marca.toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  return OWN_BRANDS_NORM.has(norm)
}

export interface CompetidorGrupo {
  producto_id: number
  descripcion: string
  marca: string
  segmento: string | null
  pvp_actual: number | null   // precio máximo del rango — usado para cálculos
  pvp_min: number | null      // precio mínimo del rango
}

export interface AvantiSku {
  ean: string
  descripcion: string
  marca: string                 // marca real del SKU (AVANTI, PASTAMANÍA, etc.)
  pvp_sugerido: number | null   // precio que Avanti define en la lista — base de simulación
  pvp_scraper: number | null    // precio real en góndola (del scraper)
  precio_neto: number
  precio_iva_calc: number | null
  iva_rate: number              // tasa de IVA del SKU (ej: 0.22, 0.10)
}

export interface GrupoSimulador {
  familia: string
  subfamilia: string
  grupo: number
  avanti: AvantiSku[]           // uno o más SKUs con el mismo grupo_comparable
  competidores: CompetidorGrupo[]
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''
    const familiaFiltro = searchParams.get('familia') ?? ''

    // 1. Cadenas disponibles
    const { data: cadenasRaw } = await supabase
      .from('vw_margen_cadena')
      .select('cadena')
    const cadenas = [...new Set((cadenasRaw ?? []).map((r) => r.cadena).filter(Boolean))].sort()

    if (!cadena) return NextResponse.json({ cadenas, familias: [], grupos: [] })

    // 2. SKUs Avanti en la cadena (desde vista)
    const { data: vistaRows, error: vistaError } = await supabase
      .from('vw_margen_cadena')
      .select('ean, descripcion, familia, sub_familia, marca, iva_rate, precio_neto, precio_iva_calc, pvp_sugerido, precio_scraper')
      .eq('cadena', cadena)
    if (vistaError) throw vistaError

    const eans = (vistaRows ?? []).map((r) => r.ean).filter(Boolean)

    // 3. grupo_comparable desde gl_skus
    const { data: skusData } = await supabase
      .from('gl_skus')
      .select('ean, grupo_comparable, familia, sub_familia, producto_id')
      .eq('tenant_id', TENANT_ID)
      .in('ean', eans)

    const skuPorEan: Record<string, {
      grupo_comparable: number | null; familia: string; sub_familia: string; producto_id: number | null
    }> = {}
    for (const s of skusData ?? []) {
      if (s.ean) skuPorEan[s.ean] = {
        grupo_comparable: s.grupo_comparable ?? null,
        familia: s.familia ?? '',
        sub_familia: s.sub_familia ?? '',
        producto_id: s.producto_id ?? null,
      }
    }

    // 4. Competidores desde pm_monitoring (cadena mapeada)
    const competidoresPorGrupo: Record<string, CompetidorGrupo[]> = {}
    const pmCadena = PM_CADENA_MAP[cadena] ?? ''

    if (pmCadena) {
      const { data: monitores } = await supabase
        .from('pm_monitoring')
        .select('monitor_id, producto_id')
        .eq('cadena', pmCadena)
        .eq('activo', true)

      if (monitores && monitores.length > 0) {
        const monitorIds = monitores.map((m) => m.monitor_id)
        const prodPorMonitor: Record<number, number> = {}
        for (const m of monitores) prodPorMonitor[m.monitor_id] = m.producto_id

        // Fecha desde: último aumento de precios de Avanti, con mínimo de 90 días atrás
        // (para capturar precios normales aunque haya ofertas recientes)
        const { data: ultimaActRow } = await supabase
          .from('gl_lista_precios')
          .select('vigencia_desde')
          .eq('tenant_id', TENANT_ID)
          .eq('cadena', cadena)
          .order('vigencia_desde', { ascending: false })
          .limit(1)
          .single()

        const hace90dias = (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0] })()
        const fechaDesde = ultimaActRow?.vigencia_desde && ultimaActRow.vigencia_desde < hace90dias
          ? ultimaActRow.vigencia_desde   // último update fue hace más de 90 días → usar esa fecha
          : hace90dias                    // siempre mirar al menos 90 días atrás para el rango

        // Rango de precios desde el último aumento hasta hoy
        const { data: precios } = await supabase
          .from('pm_precios')
          .select('monitor_id, precio')
          .in('monitor_id', monitorIds)
          .gte('fecha', fechaDesde)
          .not('precio', 'is', null)

        const rangoPorMonitor: Record<number, { min: number; max: number }> = {}
        for (const p of precios ?? []) {
          const v = parseFloat(String(p.precio))
          if (!rangoPorMonitor[p.monitor_id]) {
            rangoPorMonitor[p.monitor_id] = { min: v, max: v }
          } else {
            if (v < rangoPorMonitor[p.monitor_id].min) rangoPorMonitor[p.monitor_id].min = v
            if (v > rangoPorMonitor[p.monitor_id].max) rangoPorMonitor[p.monitor_id].max = v
          }
        }
        // pvp_actual = max (usado para posicionamiento y cálculo de aumento competencia)
        const maxPorMonitor: Record<number, number> = {}
        for (const [mid, r] of Object.entries(rangoPorMonitor)) {
          maxPorMonitor[Number(mid)] = r.max
        }

        const productoIds = monitores.map((m) => m.producto_id)

        const [{ data: pmProductos }, { data: segmentosData }, { data: skusGrupo }] = await Promise.all([
          supabase.from('pm_productos')
            .select('producto_id, descripcion, marca, familia, sub_familia, grupo_comparable')
            .in('producto_id', productoIds),
          supabase.from('gl_marca_segmento')
            .select('marca, segmento')
            .eq('tenant_id', TENANT_ID),
          supabase.from('gl_skus')
            .select('producto_id, grupo_comparable, familia, sub_familia')
            .eq('tenant_id', TENANT_ID)
            .in('producto_id', productoIds),
        ])

        const segPorMarca: Record<string, string> = {}
        for (const s of segmentosData ?? []) segPorMarca[s.marca] = s.segmento

        // grupo_comparable: gl_skus tiene prioridad sobre pm_productos
        const infoPorProd: Record<number, {
          descripcion: string; marca: string; gc: number | null; fam: string; sub: string
        }> = {}
        for (const p of pmProductos ?? []) {
          infoPorProd[p.producto_id] = {
            descripcion: p.descripcion ?? '',
            marca: p.marca ?? '',
            gc: p.grupo_comparable ?? null,
            fam: p.familia ?? '',
            sub: p.sub_familia ?? '',
          }
        }
        for (const s of skusGrupo ?? []) {
          if (s.producto_id && infoPorProd[s.producto_id]) {
            if (s.grupo_comparable !== null) infoPorProd[s.producto_id].gc = s.grupo_comparable
            if (s.familia) infoPorProd[s.producto_id].fam = s.familia
            if (s.sub_familia) infoPorProd[s.producto_id].sub = s.sub_familia
          }
        }

        // Acumular competidores por grupo (excluir AVANTI)
        const raw: Record<string, Record<string, CompetidorGrupo>> = {}

        for (const [midStr, pvp] of Object.entries(maxPorMonitor)) {
          const mid = Number(midStr)
          const prodId = prodPorMonitor[mid]
          if (!prodId) continue
          const info = infoPorProd[prodId]
          if (!info?.gc) continue
          if (isOwnBrand(info.marca)) continue  // nuestras marcas vienen de gl_lista_precios

          const k = `${info.fam}||${info.sub}||${info.gc}`
          if (!raw[k]) raw[k] = {}
          // Deduplica por marca: queda el de mayor precio
          if (!raw[k][info.marca] || pvp > (raw[k][info.marca].pvp_actual ?? 0)) {
            raw[k][info.marca] = {
              producto_id: prodId,
              descripcion: info.descripcion,
              marca: info.marca,
              segmento: segPorMarca[info.marca] ?? null,
              pvp_actual: pvp,                                          // max
              pvp_min: rangoPorMonitor[mid]?.min ?? pvp,                // min
            }
          }
        }

        // Convertir a arrays y ordenar por segmento (primera → segunda → marca_propia → value → null)
        const ORDEN_SEGMENTO: Record<string, number> = {
          primera: 0, segunda: 1, marca_propia: 2, value: 3,
        }
        for (const k of Object.keys(raw)) {
          competidoresPorGrupo[k] = Object.values(raw[k]).sort((a, b) => {
            const oa = a.segmento ? (ORDEN_SEGMENTO[a.segmento] ?? 9) : 9
            const ob = b.segmento ? (ORDEN_SEGMENTO[b.segmento] ?? 9) : 9
            if (oa !== ob) return oa - ob
            return (b.pvp_actual ?? 0) - (a.pvp_actual ?? 0)
          })
        }
      }
    }

    // 5. Construir grupos
    const familiasSet = new Set<string>()
    const gruposMap: Record<string, GrupoSimulador> = {}

    for (const row of vistaRows ?? []) {
      const sku = skuPorEan[row.ean]
      if (!sku?.grupo_comparable) continue
      const familia = row.familia ?? ''
      const subfamilia = row.sub_familia ?? ''
      if (familiaFiltro && familia !== familiaFiltro) continue

      familiasSet.add(familia)
      const k = `${familia}||${subfamilia}||${sku.grupo_comparable}`

      if (!gruposMap[k]) {
        gruposMap[k] = {
          familia,
          subfamilia,
          grupo: sku.grupo_comparable,
          avanti: [],
          competidores: competidoresPorGrupo[k] ?? [],
        }
      }
      gruposMap[k].avanti.push({
        ean: row.ean,
        descripcion: row.descripcion ?? '',
        marca: row.marca ?? 'AVANTI',
        pvp_sugerido: row.pvp_sugerido ? parseFloat(String(row.pvp_sugerido)) : null,
        pvp_scraper: row.precio_scraper ? parseFloat(String(row.precio_scraper)) : null,
        precio_neto: parseFloat(String(row.precio_neto)),
        precio_iva_calc: row.precio_iva_calc ? parseFloat(String(row.precio_iva_calc)) : null,
        iva_rate: row.iva_rate ? parseFloat(String(row.iva_rate)) : 0.22,
      })
    }

    const grupos = Object.values(gruposMap).sort((a, b) => {
      const f = a.familia.localeCompare(b.familia)
      if (f !== 0) return f
      const s = a.subfamilia.localeCompare(b.subfamilia)
      if (s !== 0) return s
      return a.grupo - b.grupo
    })

    // Grupo de cadenas: buscar compañeras del mismo grupo
    const CADENA_TO_NOMBRE: Record<string, string> = {
      DISCO: 'Disco', DEVOTO: 'Devoto', GEANT: 'Géant',
      TATA: 'Ta-Ta', TIENDA: 'Tienda Inglesa', MACRO: 'Macro',
    }
    const NOMBRE_TO_CADENA: Record<string, string> = Object.fromEntries(
      Object.entries(CADENA_TO_NOMBRE).map(([k, v]) => [v, k])
    )

    let grupoCadena: string | null = null
    let companeras: string[] = []
    const nombreCadena = CADENA_TO_NOMBRE[cadena]
    if (nombreCadena) {
      const { data: cadenaRow } = await supabase
        .from('gl_cadenas')
        .select('grupo_cadena')
        .eq('tenant_id', TENANT_ID)
        .eq('nombre', nombreCadena)
        .single()
      grupoCadena = cadenaRow?.grupo_cadena ?? null
      if (grupoCadena) {
        const { data: comp } = await supabase
          .from('gl_cadenas')
          .select('nombre')
          .eq('tenant_id', TENANT_ID)
          .eq('grupo_cadena', grupoCadena)
          .neq('nombre', nombreCadena)
        companeras = (comp ?? []).map(c => NOMBRE_TO_CADENA[c.nombre]).filter(Boolean) as string[]
      }
    }

    // Descuentos comerciales por familia (y opcionalmente por marca) para la cadena
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: descuentosRaw } = await (supabase as any)
      .from('gl_descuento_cadena')
      .select('familia, marca, descuento_pct')
      .eq('tenant_id', TENANT_ID)
      .ilike('cadena', cadena)
      .is('vigencia_hasta', null)

    const descuentosPorFamilia: Record<string, number> = {}
    // { familia: { marca: pct } } — override por marca dentro de una familia
    const descuentosPorFamiliaMarca: Record<string, Record<string, number>> = {}
    let descGlobal = 0
    for (const d of descuentosRaw ?? []) {
      const pct = parseFloat(String(d.descuento_pct))
      if (d.familia && d.marca) {
        // Descuento especifico para una marca
        if (!descuentosPorFamiliaMarca[d.familia]) descuentosPorFamiliaMarca[d.familia] = {}
        descuentosPorFamiliaMarca[d.familia][d.marca] = pct
      } else if (d.familia) {
        descuentosPorFamilia[d.familia] = pct
      } else {
        descGlobal = pct
      }
    }

    return NextResponse.json({
      cadenas, familias: [...familiasSet].sort(), grupos,
      grupoCadena, companeras,
      descuentosPorFamilia, descuentosPorFamiliaMarca, descGlobal,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
