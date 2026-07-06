import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export interface ItemVerificacion {
  ean: string
  descripcion: string
  marca: string
  familia: string
  subfamilia: string
  pvp_actual: number | null
  pvp_sugerido: number | null
  var_pct: number | null
  descuento_pct: number | null
  precio_neto: number | null
  precio_neto_editado: number | null
  precio_iva_calc: number | null
  iva_rate: number
  margen_pct: number | null
  margen_pct_anterior: number | null
  pvp_anterior: number | null
  precio_fact_anterior: number | null
  margen_cadena_actual: number | null
  margen_cadena_nuevo: number | null
  vigencia_desde: string | null
  precio_dist_anterior: number | null
  precio_dist_nuevo: number | null
}

export interface CadenaConSimulacion {
  cadena: string
  simulacion_id: string
  vigencia_desde: string
  nombre: string | null
  estado: string
  verificada_en: string | null
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: simsEjecutadas, error: simErr } = await (supabase as any)
      .from('gl_simulaciones')
      .select('id, cadena, vigencia_desde, nombre, estado, verificada_en')
      .eq('tenant_id', TENANT_ID)
      .in('estado', ['ejecutada', 'verificada'])
      .order('vigencia_desde', { ascending: false })

    if (simErr) throw simErr

    const cadenasMap: Record<string, CadenaConSimulacion> = {}
    for (const s of simsEjecutadas ?? []) {
      if (!cadenasMap[s.cadena]) {
        cadenasMap[s.cadena] = {
          cadena: s.cadena,
          simulacion_id: s.id,
          vigencia_desde: s.vigencia_desde,
          nombre: s.nombre ?? null,
          estado: s.estado ?? 'ejecutada',
          verificada_en: s.verificada_en ?? null,
        }
      }
    }

    const CADENA_ORDER = ['DEVOTO', 'DISCO', 'GEANT', 'MACRO', 'TATA', 'TIENDA', 'PEDIDOSYA', 'COMERCIO', 'INTERIOR']
    const cadenaRank = (c: string) => { const i = CADENA_ORDER.indexOf(c); return i === -1 ? 99 : i }
    const cadenas = Object.values(cadenasMap).sort((a, b) => cadenaRank(a.cadena) - cadenaRank(b.cadena))

    if (!cadena) {
      return NextResponse.json({ cadenas, items: [], familias: [] })
    }

    const simActual = cadenasMap[cadena]
    if (!simActual) {
      return NextResponse.json({ cadenas, items: [], familias: [] })
    }

    // Leer la lista de precios de la vigencia exacta de la simulacion
    // (NO usar vw_margen_cadena porque filtra por CURRENT_DATE y excluiria fechas futuras)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listaNueva, error: listaNuevaErr } = await (supabase as any)
      .from('gl_lista_precios')
      .select('ean, precio_neto, precio_iva, pvp_sugerido, vigencia_desde')
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', cadena)
      .eq('vigencia_desde', simActual.vigencia_desde)

    if (listaNuevaErr) throw listaNuevaErr

    // Obtener info de SKUs (descripcion, familia, marca, iva_rate) para los EANs de la nueva lista
    const eansNuevos = (listaNueva ?? []).map((r: { ean: string }) => r.ean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: skusInfo } = await (supabase as any)
      .from('gl_skus')
      .select('ean, descripcion, marca, familia, sub_familia, iva_rate')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .in('ean', eansNuevos)

    const skuPorEan: Record<string, { descripcion: string; marca: string; familia: string; sub_familia: string; iva_rate: number }> = {}
    for (const s of skusInfo ?? []) {
      if (s.ean) skuPorEan[s.ean] = {
        descripcion: s.descripcion ?? '',
        marca: s.marca ?? '',
        familia: s.familia ?? '',
        sub_familia: s.sub_familia ?? '',
        iva_rate: s.iva_rate ? parseFloat(String(s.iva_rate)) : 0.22,
      }
    }

    // Construir vistaRaw compatible con el shape anterior
    const vistaRaw = (listaNueva ?? []).map((lp: { ean: string; precio_neto: string | null; precio_iva: string | null; pvp_sugerido: string | null; vigencia_desde: string }) => {
      const sku = skuPorEan[lp.ean]
      if (!sku) return null
      return {
        ean: lp.ean,
        descripcion: sku.descripcion,
        marca: sku.marca,
        familia: sku.familia,
        sub_familia: sku.sub_familia,
        iva_rate: sku.iva_rate,
        precio_neto: lp.precio_neto,
        pvp_sugerido: lp.pvp_sugerido,
        vigencia_desde: lp.vigencia_desde,
      }
    }).filter(Boolean)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: simItems } = await (supabase as any)
      .from('gl_simulacion_items')
      .select('ean, pvp_base, pvp_nuevo')
      .eq('simulacion_id', simActual.simulacion_id)

    const pvpBasePorEan: Record<string, number> = {}
    const pvpNuevoPorEan: Record<string, number> = {}
    const simEans = new Set<string>()
    for (const si of simItems ?? []) {
      if (si.ean) {
        simEans.add(si.ean)
        if (si.pvp_base) pvpBasePorEan[si.ean] = parseFloat(String(si.pvp_base))
        if (si.pvp_nuevo) pvpNuevoPorEan[si.ean] = parseFloat(String(si.pvp_nuevo))
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prevPrecios } = await (supabase as any)
      .from('gl_lista_precios')
      .select('ean, precio_neto, pvp_sugerido, vigencia_desde')
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', cadena)
      .lt('vigencia_desde', simActual.vigencia_desde)
      .order('vigencia_desde', { ascending: false })

    const prevPorEan: Record<string, { precio_neto: number | null; pvp_sugerido: number | null }> = {}
    let listaAnteriorVigencia: string | null = null
    for (const p of prevPrecios ?? []) {
      if (!listaAnteriorVigencia) listaAnteriorVigencia = p.vigencia_desde
      if (!prevPorEan[p.ean]) {
        prevPorEan[p.ean] = {
          precio_neto: p.precio_neto ? parseFloat(String(p.precio_neto)) : null,
          pvp_sugerido: p.pvp_sugerido ? parseFloat(String(p.pvp_sugerido)) : null,
        }
      }
    }

    // Precios COMERCIO (para columna Precio Dist en tab INTERIOR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comercioPreciosRaw } = await (supabase as any)
      .from('gl_lista_precios')
      .select('ean, precio_neto, vigencia_desde')
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', 'COMERCIO')
      .order('vigencia_desde', { ascending: false })

    const comercioCIvaNuevoPorEan: Record<string, number> = {}
    const comercioCIvaAntPorEan: Record<string, number> = {}
    for (const cp of comercioPreciosRaw ?? []) {
      if (!cp.ean || !cp.precio_neto) continue
      const ivaR = skuPorEan[cp.ean]?.iva_rate ?? 0.22
      const civa = Math.round(parseFloat(String(cp.precio_neto)) * (1 + ivaR) * 100) / 100
      if (!comercioCIvaNuevoPorEan[cp.ean]) comercioCIvaNuevoPorEan[cp.ean] = civa
      if (cp.vigencia_desde < simActual.vigencia_desde && !comercioCIvaAntPorEan[cp.ean]) {
        comercioCIvaAntPorEan[cp.ean] = civa
      }
    }

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
      if (d.familia && d.marca) {
        if (!descPorFamiliaMarca[d.familia]) descPorFamiliaMarca[d.familia] = {}
        descPorFamiliaMarca[d.familia][d.marca] = d.descuento_pct
      } else if (d.familia) {
        descPorFamilia[d.familia] = d.descuento_pct
      } else {
        descGlobal = d.descuento_pct
      }
    }

    const getDescuento = (fam: string, marca: string): number | null =>
      descPorFamiliaMarca[fam]?.[marca] ?? descPorFamilia[fam] ?? descGlobal

    const calcVar = (nuevo: number | null, base: number | null): number | null => {
      if (!nuevo || !base || base <= 0) return null
      return Math.round(((nuevo - base) / base) * 1000) / 10
    }

    const items: ItemVerificacion[] = []
    const familiasSet = new Set<string>()

    for (const row of vistaRaw ?? []) {
      const familia = row.familia ?? ''
      const marca = row.marca ?? ''
      const pvpSugerido = row.pvp_sugerido ? parseFloat(String(row.pvp_sugerido)) : null
      if (!pvpSugerido) continue

      const ivaRate = row.iva_rate ? parseFloat(String(row.iva_rate)) : 0.22
      const descuento = getDescuento(familia, marca)
      const dtoPct = descuento !== null ? descuento / 100 : 0

      // Bloque 2: valores de la lista nueva (vigencia simulación)
      const precioNetoNuevo = row.precio_neto ? parseFloat(String(row.precio_neto)) : null

      // Bloque 1: precio actual y precio_neto base
      // - Productos en la simulación (simEans): usar pvp_base de gl_simulacion_items + lista anterior
      // - Productos sin simulación (nuevos/sin cambio): usar pvpSugerido y precio_neto de la lista nueva
      //   → así PVP ACTUAL = PVP NUEVO y MB ACT = MB PROP cuando no hay aumento
      const inSim = simEans.has(row.ean)
      const pvpActual = inSim
        ? (prevPorEan[row.ean]?.pvp_sugerido ?? pvpBasePorEan[row.ean] ?? null)
        : pvpSugerido
      const precioNetoMay = inSim
        ? (prevPorEan[row.ean]?.precio_neto ?? null)
        : precioNetoNuevo

      // Usar pvp_nuevo de gl_simulacion_items si existe (fix para INTERIOR que no tiene nueva lista)
      const pvpNuevo: number | null = (inSim && pvpNuevoPorEan[row.ean]) ? pvpNuevoPorEan[row.ean] : pvpSugerido
      // VAR%: solo calcular para EANs en la simulación
      const varPct = inSim ? calcVar(pvpNuevo, pvpActual) : null

      // Bloque 1: lista anterior
      const precioFactAntSinIva = precioNetoMay !== null
        ? Math.round(precioNetoMay * (1 - dtoPct) * 100) / 100
        : null
      const precioFactAnterior = precioFactAntSinIva !== null
        ? Math.round(precioFactAntSinIva * (1 + ivaRate) * 100) / 100
        : null
      // Solo usar precio COMERCIO anterior (< vigencia sim). NO usar fallback a misma vigencia:
      // si no hay precio anterior, mostrar null (producto sin historial en COMERCIO)
      const comercioAntPrice = comercioCIvaAntPorEan[row.ean] ?? null
      const margenAnterior = cadena === 'INTERIOR'
        ? (pvpActual !== null && comercioAntPrice !== null && comercioAntPrice > 0
          ? Math.round((pvpActual - comercioAntPrice) / comercioAntPrice * 1000) / 10
          : null)
        : (pvpActual !== null && precioFactAnterior !== null && precioFactAnterior > 0
          ? Math.round((pvpActual - precioFactAnterior) / precioFactAnterior * 1000) / 10
          : null)
      const precioNeto = precioNetoNuevo !== null
        ? Math.round(precioNetoNuevo * (1 - dtoPct) * 100) / 100
        : null
      const precioFactIva = precioNeto !== null
        ? Math.round(precioNeto * (1 + ivaRate) * 100) / 100
        : null
      const comercioNuevoPrice = comercioCIvaNuevoPorEan[row.ean] ?? null
      const margen = cadena === 'INTERIOR'
        ? (pvpNuevo !== null && pvpNuevo > 0 && comercioNuevoPrice !== null && comercioNuevoPrice > 0
          ? Math.round((pvpNuevo - comercioNuevoPrice) / comercioNuevoPrice * 1000) / 10
          : null)
        : (pvpNuevo !== null && pvpNuevo > 0 && precioFactIva !== null && precioFactIva > 0
          ? Math.round((pvpNuevo - precioFactIva) / precioFactIva * 1000) / 10
          : null)

      familiasSet.add(familia)
      items.push({
        ean: row.ean,
        descripcion: row.descripcion ?? '',
        marca: row.marca ?? '',
        familia,
        subfamilia: row.sub_familia ?? '',
        pvp_actual: pvpActual,
        pvp_sugerido: pvpNuevo,
        var_pct: varPct,
        descuento_pct: descuento,
        precio_neto: precioNeto,
        precio_neto_editado: precioNeto,
        precio_iva_calc: precioFactIva ?? null,
        iva_rate: ivaRate,
        margen_pct: margen,
        margen_pct_anterior: margenAnterior,
        pvp_anterior: pvpActual,
        precio_fact_anterior: precioFactAnterior,
        margen_cadena_actual: null,
        margen_cadena_nuevo: null,
        vigencia_desde: row.vigencia_desde ?? null,
        precio_dist_anterior: comercioCIvaAntPorEan[row.ean] ?? null,
        precio_dist_nuevo: comercioCIvaNuevoPorEan[row.ean] ?? null,
      })
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

    // Segmentos: 0=AVANTI, 1=PASTAMANÍA, 2=Marca Propia, 3=Value
    const marcaSegmento = (m: string): number => {
      if (m === 'AVANTI') return 0
      if (m === 'PASTAMANÍA') return 1
      // Marca Propia del retailer o marcas propias asociadas
      if (['TA-TA', 'QUE TAPA', 'QUE FACIL', 'TUTTI PASTA'].includes(m)) return 2
      return 3 // Value / competencia
    }

    items.sort((a, b) => {
      // 1. Segmento (Avanti → Pastamanía → Marca Propia → Value)
      const seg = marcaSegmento(a.marca) - marcaSegmento(b.marca)
      if (seg !== 0) return seg
      // 2. Nombre de marca (para mantener todos los productos de la misma marca juntos)
      const mn = a.marca.localeCompare(b.marca)
      if (mn !== 0) return mn
      // 3. Familia
      const fr = familiaRank(a.familia) - familiaRank(b.familia)
      if (fr !== 0) return fr
      // 4. Subfamilia
      const s = a.subfamilia.localeCompare(b.subfamilia)
      if (s !== 0) return s
      return a.descripcion.localeCompare(b.descripcion)
    })

    const familiasSorted = [...familiasSet].sort((a, b) => familiaRank(a) - familiaRank(b))

    return NextResponse.json({
      cadenas,
      items,
      familias: familiasSorted,
      lista_anterior_vigencia: listaAnteriorVigencia,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/verificacion
export async function PATCH(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json() as { ean: string; cadena: string; precio_neto: number }
    const { ean, cadena, precio_neto } = body

    if (!ean || !cadena || typeof precio_neto !== 'number') {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: skuRow } = await (supabase as any)
      .from('gl_skus')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('ean', ean)
      .single()

    if (!skuRow) {
      return NextResponse.json({ error: `SKU no encontrado para EAN ${ean}` }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('gl_lista_precios')
      .update({ precio_neto })
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', cadena)
      .eq('sku_id', skuRow.id)
      .order('vigencia_desde', { ascending: false })
      .limit(1)

    if (updateErr) throw updateErr

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
