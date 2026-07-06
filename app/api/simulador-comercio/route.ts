import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Marcas propias — no mostrar como competidores
const OWN_BRANDS = new Set([
  'AVANTI', 'PASTAMANIA', 'PASTAMANÍA', 'QUE FACIL', 'QUE FÁCIL',
  'QUE TAPA', 'TUTTI PASTA', 'TA-TA', 'CEFA',
])

const ORDEN_SEGMENTO: Record<string, number> = {
  primera: 0, segunda: 1, marca_propia: 2, value: 3,
}

export interface RefPrecio {
  fuente: string
  descripcion: string
  gramaje: string | null
  precio_neto: number
  precio_iva: number | null
  pvp_sugerido: number | null
  iva_rate: number
  segmento?: string | null   // solo para refs de pm_monitoring
  pvp_retail?: number | null  // precio real en góndola (de pm_monitoring), merged en ref manual
}

export interface ItemSimuladorComercio {
  ean: string
  cod_interno: string
  descripcion: string
  marca: string
  familia: string
  subfamilia: string
  gramaje: string | null
  iva_rate: number
  // Precios actuales (vigencia activa)
  precio_neto_actual: number
  precio_iva_actual: number
  pvp_sugerido_actual: number | null
  margen_actual: number | null
  // Precios simulados (editables en el frontend)
  precio_neto_sim: number
  precio_iva_sim: number
  pvp_sugerido_sim: number | null
  margen_sim: number | null
  var_pct: number | null
  // Referencia competencia
  refs: RefPrecio[]
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''

    // 1. Cadenas disponibles: COMERCIO e INTERIOR (simulaciones verificadas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: simsRaw } = await (supabase as any)
      .from('gl_simulaciones')
      .select('cadena')
      .eq('tenant_id', TENANT_ID)
      .in('cadena', ['COMERCIO', 'INTERIOR', 'PEDIDOSYA'])
      .in('estado', ['ejecutada', 'verificada'])

    const CADENA_ORDER = ['COMERCIO', 'INTERIOR', 'PEDIDOSYA']
    const cadenas = [...new Set((simsRaw ?? []).map((s: { cadena: string }) => s.cadena))]
      .sort((a, b) => CADENA_ORDER.indexOf(a) - CADENA_ORDER.indexOf(b)) as string[]

    if (!cadena) {
      return NextResponse.json({ cadenas, items: [], familias: [], fuentes: [] })
    }

    // 2. Simulacion mas reciente para la cadena
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: simRow } = await (supabase as any)
      .from('gl_simulaciones')
      .select('id, vigencia_desde')
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', cadena)
      .in('estado', ['ejecutada', 'verificada'])
      .order('vigencia_desde', { ascending: false })
      .limit(1)
      .single()

    if (!simRow) {
      return NextResponse.json({ cadenas, items: [], familias: [], fuentes: [] })
    }

    // 3. Lista de precios activa (vigencia de la simulacion)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listaActual, error: listaErr } = await (supabase as any)
      .from('gl_lista_precios')
      .select('ean, sku_id, precio_neto, precio_iva, pvp_sugerido')
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', cadena)
      .eq('vigencia_desde', simRow.vigencia_desde)

    if (listaErr) throw listaErr

    if (!listaActual?.length) {
      return NextResponse.json({ cadenas, items: [], familias: [], fuentes: [] })
    }

    // 4. Info de SKUs (incluye grupo_comparable para relacionar con pm)
    const eans = listaActual.map((r: { ean: string }) => r.ean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: skusRaw } = await (supabase as any)
      .from('gl_skus')
      .select('ean, cod_interno, descripcion, marca, familia, sub_familia, iva_rate, grupo_comparable')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .in('ean', eans)

    const skuPorEan: Record<string, {
      cod_interno: string; descripcion: string; marca: string
      familia: string; sub_familia: string; iva_rate: number
      grupo_comparable: number | null
    }> = {}
    for (const s of skusRaw ?? []) {
      skuPorEan[s.ean] = {
        cod_interno: s.cod_interno ?? '',
        descripcion: s.descripcion ?? '',
        marca: s.marca ?? '',
        familia: s.familia ?? '',
        sub_familia: s.sub_familia ?? '',
        iva_rate: s.iva_rate ? parseFloat(String(s.iva_rate)) : 0.22,
        grupo_comparable: s.grupo_comparable ?? null,
      }
    }

    // 5. Descuentos comerciales para la cadena
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: descuentosRaw } = await (supabase as any)
      .from('gl_descuento_cadena')
      .select('familia, marca, descuento_pct')
      .eq('tenant_id', TENANT_ID)
      .ilike('cadena', cadena)
      .is('vigencia_hasta', null)

    const descPorFamilia: Record<string, number> = {}
    const descPorFamiliaMarca: Record<string, Record<string, number>> = {}
    let descGlobal: number | null = null
    for (const d of descuentosRaw ?? []) {
      const pct = parseFloat(String(d.descuento_pct))
      if (d.familia && d.marca) {
        if (!descPorFamiliaMarca[d.familia]) descPorFamiliaMarca[d.familia] = {}
        descPorFamiliaMarca[d.familia][d.marca] = pct
      } else if (d.familia) {
        descPorFamilia[d.familia] = pct
      } else {
        descGlobal = pct
      }
    }
    const getDesc = (fam: string, marca: string): number =>
      descPorFamiliaMarca[fam]?.[marca] ?? descPorFamilia[fam] ?? descGlobal ?? 0

    // 6. Precios de referencia manuales (gl_ref_precios_comercio), por familia||subfamilia
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: refsRaw } = await (supabase as any)
      .from('gl_ref_precios_comercio')
      .select('fuente, descripcion, familia, sub_familia, gramaje, precio_neto, precio_iva, pvp_sugerido, iva_rate, grupo_comparable')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .not('grupo_comparable', 'is', null)   // solo refs con gc asignado
      .order('fuente')
      .order('sub_familia')
      .order('descripcion')

    // Mapeo de subfamilias de gl_skus → subfamilias de gl_ref_precios_comercio
    // Solo para los casos donde los nombres difieren entre tablas.
    const SUB_FAM_REF: Record<string, string> = {
      'Raviolones':   'Ravioles',    // gl_skus usa 'Raviolones', refs usa 'Ravioles'
      'Tagliatelle':  'Tallarines',  // gl_skus usa 'Tagliatelle', refs usa 'Tallarines'
      'Salsas 200 g': 'Salsas',      // gl_skus usa 'Salsas 200 g', refs usa 'Salsas'
    }
    const mapSubFamRef = (sf: string): string => SUB_FAM_REF[sf] ?? sf

    // Index refs manuales por familia||subfamilia||grupo_comparable — igual que simulador retail
    const refsManualesPorClave: Record<string, RefPrecio[]> = {}
    for (const r of refsRaw ?? []) {
      const key = `${r.familia}||${r.sub_familia}||${r.grupo_comparable}`
      if (!refsManualesPorClave[key]) refsManualesPorClave[key] = []
      refsManualesPorClave[key].push({
        fuente: r.fuente,
        descripcion: r.descripcion,
        gramaje: r.gramaje,
        precio_neto: parseFloat(String(r.precio_neto)),
        precio_iva: r.precio_iva ? parseFloat(String(r.precio_iva)) : null,
        pvp_sugerido: r.pvp_sugerido ? parseFloat(String(r.pvp_sugerido)) : null,
        iva_rate: r.iva_rate ? parseFloat(String(r.iva_rate)) : 0.22,
      })
    }

    const fuentesManuales = [...new Set((refsRaw ?? []).map((r: { fuente: string }) => r.fuente))].sort() as string[]

    // 7. Precios de competencia desde pm_monitoring
    //    Indexados por familia||sub_familia||grupo_comparable — igual que simulador retail.
    //    Así "Copetin" solo ve copetines, "Empanadas x 40" solo ve packs x40, etc.
    const gruposComparables = [...new Set(
      Object.values(skuPorEan)
        .map(s => s.grupo_comparable)
        .filter((g): g is number => g !== null),
    )]

    const refsPmPorClave: Record<string, RefPrecio[]> = {}  // clave: familia||sub_familia||gc
    const fuentesPm: string[] = []

    if (gruposComparables.length > 0) {
      const [{ data: pmProductos }, { data: segmentosData }] = await Promise.all([
        supabase.from('pm_productos')
          .select('producto_id, descripcion, marca, familia, sub_familia, grupo_comparable')
          .in('grupo_comparable', gruposComparables),
        supabase.from('gl_marca_segmento')
          .select('marca, segmento')
          .eq('tenant_id', TENANT_ID),
      ])

      const segPorMarca: Record<string, string> = {}
      for (const s of segmentosData ?? []) segPorMarca[s.marca] = s.segmento

      // Excluir marcas propias
      const compProductos = (pmProductos ?? []).filter(
        p => !OWN_BRANDS.has((p.marca ?? '').toUpperCase()),
      )
      const compProdIds = compProductos.map(p => p.producto_id)

      if (compProdIds.length > 0) {
        const { data: monitores } = await supabase
          .from('pm_monitoring')
          .select('monitor_id, producto_id')
          .in('producto_id', compProdIds)
          .eq('activo', true)

        if (monitores && monitores.length > 0) {
          const monitorIds = monitores.map(m => m.monitor_id)

          // Últimos 90 días
          const hace90 = new Date()
          hace90.setDate(hace90.getDate() - 90)
          const fechaDesde = hace90.toISOString().split('T')[0]

          const { data: precios } = await supabase
            .from('pm_precios')
            .select('monitor_id, precio')
            .in('monitor_id', monitorIds)
            .gte('fecha', fechaDesde)
            .not('precio', 'is', null)

          // Precio máximo por monitor
          const maxPorMonitor: Record<number, number> = {}
          for (const p of precios ?? []) {
            const v = parseFloat(String(p.precio))
            if (!isNaN(v) && (!maxPorMonitor[p.monitor_id] || v > maxPorMonitor[p.monitor_id])) {
              maxPorMonitor[p.monitor_id] = v
            }
          }

          // Mapa monitor → producto_id
          const prodPorMonitor: Record<number, number> = {}
          for (const m of monitores) prodPorMonitor[m.monitor_id] = m.producto_id

          // Info de cada pm_producto: incluye familia+sub_familia para clave exacta
          const prodInfoMap: Record<number, {
            descripcion: string; marca: string; gc: number; fam: string; sub: string
          }> = {}
          for (const p of compProductos) {
            if (p.grupo_comparable && p.familia && p.sub_familia) {
              prodInfoMap[p.producto_id] = {
                descripcion: p.descripcion ?? '',
                marca: p.marca ?? '',
                gc: p.grupo_comparable,
                fam: p.familia,
                sub: p.sub_familia,
              }
            }
          }

          // Acumular: max pvp por (familia||sub_familia||gc, marca) — igual que retail
          const rawPorClave: Record<string, Record<string, {
            pvp: number; descripcion: string; marca: string; segmento: string | null
          }>> = {}

          for (const [midStr, pvp] of Object.entries(maxPorMonitor)) {
            const mid = Number(midStr)
            const prodId = prodPorMonitor[mid]
            if (!prodId) continue
            const info = prodInfoMap[prodId]
            if (!info) continue

            const k = `${info.fam}||${info.sub}||${info.gc}`
            if (!rawPorClave[k]) rawPorClave[k] = {}
            if (!rawPorClave[k][info.marca] || pvp > rawPorClave[k][info.marca].pvp) {
              rawPorClave[k][info.marca] = {
                pvp,
                descripcion: info.descripcion,
                marca: info.marca,
                segmento: segPorMarca[info.marca] ?? null,
              }
            }
          }

          // Convertir a RefPrecio[], ordenado por segmento
          for (const [k, marcas] of Object.entries(rawPorClave)) {
            const sorted = Object.values(marcas).sort((a, b) => {
              const oa = a.segmento ? (ORDEN_SEGMENTO[a.segmento] ?? 9) : 9
              const ob = b.segmento ? (ORDEN_SEGMENTO[b.segmento] ?? 9) : 9
              if (oa !== ob) return oa - ob
              return b.pvp - a.pvp
            })

            refsPmPorClave[k] = sorted.map(m => ({
              fuente: m.marca,
              descripcion: m.descripcion,
              gramaje: null,
              precio_neto: 0,
              precio_iva: null,
              pvp_sugerido: m.pvp,
              iva_rate: 0.22,
              segmento: m.segmento,
            }))

            for (const m of Object.values(marcas)) {
              if (!fuentesPm.includes(m.marca)) fuentesPm.push(m.marca)
            }
          }
        }
      }
    }

    // 8. Construir items
    const familiasSet = new Set<string>()
    const items: ItemSimuladorComercio[] = []

    for (const lp of listaActual) {
      const sku = skuPorEan[lp.ean]
      if (!sku) continue

      const precioNeto = parseFloat(String(lp.precio_neto))
      const pvp = lp.pvp_sugerido ? parseFloat(String(lp.pvp_sugerido)) : null
      const ivaRate = sku.iva_rate
      const dtoPct = getDesc(sku.familia, sku.marca) / 100

      const precioFactIva = Math.round(precioNeto * (1 - dtoPct) * (1 + ivaRate) * 100) / 100
      const margen = pvp && pvp > 0
        ? Math.round((pvp - precioFactIva) / pvp * 1000) / 10
        : null

      // Refs manuales: buscar por familia||subfamilia||grupo_comparable — igual que simulador retail
      const refKeyExact = sku.grupo_comparable
        ? `${sku.familia}||${mapSubFamRef(sku.sub_familia)}||${sku.grupo_comparable}`
        : null
      const refsManual = refKeyExact ? (refsManualesPorClave[refKeyExact] ?? []) : []
      // Refs pm: buscar por familia||sub_familia||gc — igual que simulador retail
      const pmClave = sku.grupo_comparable
        ? `${sku.familia}||${mapSubFamRef(sku.sub_familia)}||${sku.grupo_comparable}`
        : null
      const refsPm = pmClave ? (refsPmPorClave[pmClave] ?? []) : []

      // Merge: si hay ref manual para la misma marca que una ref pm,
      // adjuntar pvp_retail a la manual y NO agregar la pm como fila separada.
      const pmByBrand = new Map<string, RefPrecio>()
      for (const pm of refsPm) {
        pmByBrand.set(pm.fuente.toUpperCase(), pm)
      }
      const mergedManual: RefPrecio[] = refsManual.map(ref => {
        const pmMatch = pmByBrand.get(ref.fuente.toUpperCase())
        if (pmMatch?.pvp_sugerido) {
          return { ...ref, pvp_retail: pmMatch.pvp_sugerido }
        }
        return ref
      })
      // Solo agregar refs pm que NO tienen ref manual para su marca
      const pmOnlyRefs = refsPm.filter(
        pm => !refsManual.some(r => r.fuente.toUpperCase() === pm.fuente.toUpperCase()),
      )
      const refs: RefPrecio[] = [...mergedManual, ...pmOnlyRefs]

      familiasSet.add(sku.familia)
      items.push({
        ean: lp.ean,
        cod_interno: sku.cod_interno,
        descripcion: sku.descripcion,
        marca: sku.marca,
        familia: sku.familia,
        subfamilia: sku.sub_familia,
        gramaje: null,
        iva_rate: ivaRate,
        precio_neto_actual: precioNeto,
        precio_iva_actual: Math.round(precioNeto * (1 + ivaRate) * 100) / 100,
        pvp_sugerido_actual: pvp,
        margen_actual: margen,
        // Simulacion empieza igual al actual
        precio_neto_sim: precioNeto,
        precio_iva_sim: Math.round(precioNeto * (1 + ivaRate) * 100) / 100,
        pvp_sugerido_sim: pvp,
        margen_sim: margen,
        var_pct: null,
        refs,
      })
    }

    // Orden: segmento (AVANTI > PASTAMANIA > otros) → familia → subfamilia → descripcion
    const marcaSegmento = (m: string) => {
      if (m === 'AVANTI') return 0
      if (m === 'PASTAMANIA' || m === 'PASTAMANÍA') return 1
      return 2
    }
    const FAMILIA_ORDER = ['Masas', 'Pastas Frescas ATM', 'Salsas', 'Empanadas Congeladas', 'Pizzas Congeladas', 'Pastas Congeladas', 'Pastas Frescas']
    const familiaRank = (f: string) => { const i = FAMILIA_ORDER.indexOf(f); return i === -1 ? 99 : i }

    items.sort((a, b) => {
      const seg = marcaSegmento(a.marca) - marcaSegmento(b.marca)
      if (seg !== 0) return seg
      const fr = familiaRank(a.familia) - familiaRank(b.familia)
      if (fr !== 0) return fr
      const sf = a.subfamilia.localeCompare(b.subfamilia)
      if (sf !== 0) return sf
      return a.descripcion.localeCompare(b.descripcion)
    })

    const familiasSorted = [...familiasSet].sort((a, b) => familiaRank(a) - familiaRank(b))

    // Fuentes combinadas: manuales primero, luego pm ordenadas (excluir las que ya están en manuales)
    const fuentesManualesUpper = new Set(fuentesManuales.map(f => f.toUpperCase()))
    const fuentes = [
      ...fuentesManuales,
      ...fuentesPm.sort().filter(f => !fuentesManualesUpper.has(f.toUpperCase())),
    ]

    return NextResponse.json({
      cadenas,
      items,
      familias: familiasSorted,
      fuentes,
      vigencia: simRow.vigencia_desde,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
