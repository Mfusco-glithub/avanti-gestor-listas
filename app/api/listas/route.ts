import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

const PM_CADENA_MAP: Record<string, string> = {
  DISCO: 'Disco',
  DEVOTO: 'Devoto',
  GEANT: 'Geant',
  TATA: 'Ta-Ta',
  TIENDA: 'Tienda Inglesa',
  MACRO: '',
}

export interface CrossCadenaRow {
  cadena: string
  precio_neto: number
  precio_iva_calc: number | null
  descuento_pct: number | null
  precio_efectivo: number | null
  pvp_scraper: number | null
  margen_real_pct: number | null
}

export interface FilaLista {
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''
    const familiaFiltro = searchParams.get('familia') ?? ''

    const { data: vistaRaw, error: vistaError } = await supabase
      .from('vw_margen_cadena')
      .select('*')
    if (vistaError) throw vistaError

    const cadenas = [...new Set((vistaRaw ?? []).map((r) => r.cadena).filter(Boolean))].sort()

    if (!cadena) {
      return NextResponse.json({ cadenas, filas: [], familias: [] })
    }

    const { data: todosDescuentos } = await supabase
      .from('gl_descuento_cadena')
      .select('cadena, familia, descuento_pct')
      .eq('tenant_id', TENANT_ID)
      .is('vigencia_hasta', null)

    const descMap: Record<string, { porFamilia: Record<string, number>; global: number | null }> = {}
    for (const d of todosDescuentos ?? []) {
      if (!descMap[d.cadena]) descMap[d.cadena] = { porFamilia: {}, global: null }
      if (d.familia) descMap[d.cadena].porFamilia[d.familia] = d.descuento_pct
      else descMap[d.cadena].global = d.descuento_pct
    }

    const getDescuento = (c: string, familia: string): number | null => {
      const entry = descMap[c]
      if (!entry) return null
      return entry.porFamilia[familia] ?? entry.global
    }

    const calcEfectivo = (precioIva: number | null, desc: number | null): number | null => {
      if (!precioIva) return null
      if (desc === null) return precioIva
      return Math.round(precioIva * (1 - desc / 100) * 100) / 100
    }

    const calcMargen = (pvp: number | null, efectivo: number | null): number | null => {
      if (!pvp || !efectivo || pvp <= 0) return null
      return Math.round(((pvp - efectivo) / pvp) * 1000) / 10
    }

    const vistaPorEan: Record<string, typeof vistaRaw> = {}
    for (const row of vistaRaw ?? []) {
      if (!vistaPorEan[row.ean]) vistaPorEan[row.ean] = []
      vistaPorEan[row.ean].push(row)
    }

    const filaCadena = (vistaRaw ?? []).filter((r) => r.cadena === cadena)
    const eans = filaCadena.map((r) => r.ean)

    const { data: skusRaw } = await supabase
      .from('gl_skus')
      .select('ean, grupo_comparable, producto_id, familia, sub_familia')
      .eq('tenant_id', TENANT_ID)
      .in('ean', eans)

    const skuPorEan: Record<string, {
      grupo_comparable: number | null; producto_id: number | null
      familia: string; sub_familia: string
    }> = {}
    for (const s of skusRaw ?? []) {
      if (s.ean) skuPorEan[s.ean] = {
        grupo_comparable: s.grupo_comparable ?? null,
        producto_id: s.producto_id ?? null,
        familia: s.familia ?? '',
        sub_familia: s.sub_familia ?? '',
      }
    }

    const compPreciosPorGrupo: Record<string, number[]> = {}
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

        const fechaDesde = new Date()
        fechaDesde.setDate(fechaDesde.getDate() - 30)

        const { data: precios } = await supabase
          .from('pm_precios')
          .select('monitor_id, precio, fecha')
          .in('monitor_id', monitorIds)
          .gte('fecha', fechaDesde.toISOString())
          .not('precio', 'is', null)

        const maxPorMonitor: Record<number, number> = {}
        for (const p of precios ?? []) {
          const precio = parseFloat(String(p.precio))
          if (!maxPorMonitor[p.monitor_id] || precio > maxPorMonitor[p.monitor_id]) {
            maxPorMonitor[p.monitor_id] = precio
          }
        }

        const productoIds = monitores.map((m) => m.producto_id)
        const { data: pmProductos } = await supabase
          .from('pm_productos')
          .select('producto_id, marca')
          .in('producto_id', productoIds)

        const marcaPorProd: Record<number, string> = {}
        for (const p of pmProductos ?? []) marcaPorProd[p.producto_id] = p.marca ?? ''

        const { data: skusGrupo } = await supabase
          .from('gl_skus')
          .select('producto_id, grupo_comparable, familia, sub_familia')
          .eq('tenant_id', TENANT_ID)
          .in('producto_id', productoIds)

        const grupoPorProd: Record<number, { gc: number | null; fam: string; sub: string }> = {}
        for (const p of pmProductos ?? []) grupoPorProd[p.producto_id] = { gc: null, fam: '', sub: '' }
        for (const s of skusGrupo ?? []) {
          if (s.producto_id) grupoPorProd[s.producto_id] = {
            gc: s.grupo_comparable ?? null,
            fam: s.familia ?? '',
            sub: s.sub_familia ?? '',
          }
        }

        for (const [midStr, precio] of Object.entries(maxPorMonitor)) {
          const mid = Number(midStr)
          const prodId = prodPorMonitor[mid]
          if (!prodId) continue
          const marca = marcaPorProd[prodId] ?? ''
          const gi = grupoPorProd[prodId]
          if (marca !== 'AVANTI' && gi?.gc !== null && gi?.gc !== undefined) {
            const k = `${gi.fam}||${gi.sub}||${gi.gc}`
            if (!compPreciosPorGrupo[k]) compPreciosPorGrupo[k] = []
            compPreciosPorGrupo[k].push(precio)
          }
        }
      }
    }

    const FAMILIA_ORDER = [
      'Masas', 'Pastas Frescas ATM', 'Salsas',
      'Empanadas Congeladas', 'Pizzas Congeladas',
      'Pastas Congeladas', 'Pastas Frescas',
    ]
    const familiaRank = (f: string) => {
      const i = FAMILIA_ORDER.indexOf(f)
      return i === -1 ? 99 : i
    }

    const filas: FilaLista[] = []
    const familiasSet = new Set<string>()

    for (const row of filaCadena) {
      const familia = row.familia ?? ''
      const subfamilia = row.sub_familia ?? ''
      if (familia) familiasSet.add(familia)
      if (familiaFiltro && familia !== familiaFiltro) continue
      const sku = skuPorEan[row.ean]

      const precioIva = row.precio_iva_calc ? parseFloat(String(row.precio_iva_calc)) : null
      const pvpScraper = row.precio_scraper ? parseFloat(String(row.precio_scraper)) : null
      const desc = getDescuento(cadena, familia)
      const efectivo = calcEfectivo(precioIva, desc)
      const margen = calcMargen(pvpScraper, efectivo)

      const crossRows = (vistaPorEan[row.ean] ?? [])
        .filter((r) => r.cadena !== cadena)
        .map((r): CrossCadenaRow => {
          const rIva = r.precio_iva_calc ? parseFloat(String(r.precio_iva_calc)) : null
          const rPvp = r.precio_scraper ? parseFloat(String(r.precio_scraper)) : null
          const rDesc = getDescuento(r.cadena, r.familia ?? '')
          const rEfectivo = calcEfectivo(rIva, rDesc)
          const rMargen = calcMargen(rPvp, rEfectivo)
          return {
            cadena: r.cadena,
            precio_neto: parseFloat(String(r.precio_neto)),
            precio_iva_calc: rIva,
            descuento_pct: rDesc,
            precio_efectivo: rEfectivo,
            pvp_scraper: rPvp,
            margen_real_pct: rMargen,
          }
        })
        .sort((a, b) => a.cadena.localeCompare(b.cadena))

      let compMin: number | null = null
      let compMax: number | null = null
      let compCount = 0
      if (sku?.grupo_comparable !== null && sku?.grupo_comparable !== undefined) {
        const k = `${familia}||${subfamilia}||${sku.grupo_comparable}`
        const precios = compPreciosPorGrupo[k] ?? []
        compCount = precios.length
        if (precios.length > 0) {
          compMin = Math.min(...precios)
          compMax = Math.max(...precios)
        }
      }

      filas.push({
        ean: row.ean,
        descripcion: row.descripcion ?? '',
        familia,
        subfamilia,
        grupo_comparable: sku?.grupo_comparable ?? null,
        producto_id: sku?.producto_id ?? null,
        precio_neto: parseFloat(String(row.precio_neto)),
        precio_iva_calc: precioIva,
        pvp_sugerido: row.pvp_sugerido ? parseFloat(String(row.pvp_sugerido)) : null,
        descuento_pct: desc,
        precio_efectivo: efectivo,
        pvp_scraper: pvpScraper,
        fecha_scraper: row.fecha_scraper ?? null,
        margen_real_pct: margen,
        comp_min: compMin,
        comp_max: compMax,
        comp_count: compCount,
        cross_cadena: crossRows,
      })
    }

    filas.sort((a, b) => {
      const fr = familiaRank(a.familia) - familiaRank(b.familia)
      if (fr !== 0) return fr
      const s = a.subfamilia.localeCompare(b.subfamilia)
      if (s !== 0) return s
      return a.descripcion.localeCompare(b.descripcion)
    })

    const familiasSorted = [...familiasSet].sort((a, b) => familiaRank(a) - familiaRank(b))
    return NextResponse.json({ cadenas, familias: familiasSorted, filas })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
