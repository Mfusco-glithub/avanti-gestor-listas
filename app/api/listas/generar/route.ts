import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generarDiscoXlsx } from '@/lib/generadores/xlsx-disco'
import { generarGduXlsx } from '@/lib/generadores/xlsx-gdu-sim'
import { generarTiendaXlsx } from '@/lib/generadores/xlsx-tienda'
import { generarMacroXlsx } from '@/lib/generadores/xlsx-macro'
import { generarPedidosYaXlsx } from '@/lib/generadores/xlsx-pedidosya'
import { generarComercioXlsx } from '@/lib/generadores/xlsx-comercio'
import { generarInteriorXlsx } from '@/lib/generadores/xlsx-interior'
import { generarImportacionXlsx } from '@/lib/generadores/xlsx-importacion'

export const dynamic = 'force-dynamic'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Mapa cadena (string en gl_lista_precios) → cadena_id (UUID en gl_cadenas)
const CADENA_IDS: Record<string, string> = {
  'DISCO':      '4eac6ac6-26dd-49a4-b18e-91fb059a2d30',
  'DEVOTO':     '53e3ee96-fc44-488d-9d3f-3d5ef4bff907',
  'GEANT':      'afd70806-10a5-43e5-b7e0-2a2726625bbb',
  'GDU':        '4b3d42ad-b91d-46ae-be30-6121bdf6eeab',
  'TATA':       '3994a2dc-4dfa-4643-ade4-87cd3af3d661',
  'TIENDA':     'd72c02cd-35bb-4da0-99d1-7381a2a1b7c4',
  'MACRO':      '896a1366-199c-45b2-b8d4-1898bb5366f0',
  'PEDIDOSYA':  '02074c8f-ceee-46ac-b99c-4dd5f0336a03',
  'INTERIOR':   '3f702438-5f31-4a77-9d63-a43525299310',
  // COMERCIO: sin cadena_id específico (no tiene códigos por cadena)
}
const GDU_CADENA_ID = '4b3d42ad-b91d-46ae-be30-6121bdf6eeab'

// POST /api/listas/generar
// Body: { simulacion_id, cadena, formato: 'xlsx_disco' | 'xlsx_gdu' | 'xlsx_tienda' | 'xlsx_macro' }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json() as { simulacion_id: string; cadena: string; formato: string }
    const { simulacion_id, cadena, formato } = body

    if (!simulacion_id || !cadena || !formato) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // 1. Simulación
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sim } = await (supabase as any)
      .from('gl_simulaciones')
      .select('id, cadena, nombre, vigencia_desde, estado')
      .eq('id', simulacion_id)
      .single()

    if (!sim) return NextResponse.json({ error: 'Simulación no encontrada' }, { status: 404 })

    // 2. Precios nuevos (vigencia de la simulación)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: preciosNuevos } = await (supabase as any)
      .from('gl_lista_precios')
      .select(`
        ean, sku_id, cadena, precio_neto, pvp_sugerido, vigencia_desde,
        gl_skus!inner (
          id, cod_interno, ean, descripcion, familia, sub_familia,
          marca, iva_rate, unidades_caja
        )
      `)
      .eq('cadena', cadena)
      .eq('vigencia_desde', sim.vigencia_desde)
      .eq('tenant_id', TENANT_ID)
      // NO filtrar por pvp_sugerido: es opcional por diseño. Hay líneas sin
      // PVP (p.ej. Gastronomía / food-service) que igual deben exportarse.
      .eq('gl_skus.activo', true)

    if (!preciosNuevos?.length) {
      return NextResponse.json({ error: `Sin precios para ${cadena} vigencia ${sim.vigencia_desde}` }, { status: 404 })
    }

    // 3. Precios anteriores (más reciente antes de esta vigencia)
    const eans = preciosNuevos.map((p: { ean: string }) => p.ean)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prevRaw } = await (supabase as any)
      .from('gl_lista_precios')
      .select('ean, precio_neto, pvp_sugerido, vigencia_desde')
      .eq('cadena', cadena)
      .eq('tenant_id', TENANT_ID)
      .lt('vigencia_desde', sim.vigencia_desde)
      .in('ean', eans)
      .order('vigencia_desde', { ascending: false })

    // precio anterior más reciente por EAN
    const prevPorEan: Record<string, { precio_neto: number; pvp_sugerido: number }> = {}
    for (const p of prevRaw ?? []) {
      if (!prevPorEan[p.ean] && p.pvp_sugerido) {
        prevPorEan[p.ean] = {
          precio_neto: parseFloat(String(p.precio_neto)),
          pvp_sugerido: parseFloat(String(p.pvp_sugerido)),
        }
      }
    }

    // 4. Códigos internos de cadena (COD GRUPO DISCO / Código GDU)
    const skuIds = preciosNuevos.map((p: { sku_id: string }) => p.sku_id)

    // Para formato GDU siempre usar los códigos de la cadena GDU
    // Para formato DISCO usar los códigos propios de la cadena (DISCO/DEVOTO/GEANT)
    const codigosCadenaId = formato === 'xlsx_gdu'
      ? GDU_CADENA_ID
      : (CADENA_IDS[cadena.toUpperCase()] ?? null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cadenasSkusQuery = (supabase as any)
      .from('gl_cadena_skus')
      .select('sku_id, cod_interno_cadena, unidades_caja_cadena')
      .in('sku_id', skuIds)

    const { data: cadenasSkus } = codigosCadenaId
      ? await cadenasSkusQuery.eq('cadena_id', codigosCadenaId)
      : await cadenasSkusQuery

    const codCadenaPorSku: Record<string, string>  = {}
    const udsTimedaPorSku: Record<string, number>   = {}
    for (const cs of cadenasSkus ?? []) {
      if (cs.sku_id) {
        codCadenaPorSku[cs.sku_id] = cs.cod_interno_cadena ?? ''
        if (cs.unidades_caja_cadena != null) udsTimedaPorSku[cs.sku_id] = cs.unidades_caja_cadena
      }
    }

    // 5. Armar items normalizados
    const items = preciosNuevos.map((p: {
      ean: string; sku_id: string; precio_neto: number; pvp_sugerido: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gl_skus: any
    }) => {
      const sku = p.gl_skus
      const prev = prevPorEan[p.ean]
      const precioNuevo = parseFloat(String(p.precio_neto))
      // pvp_sugerido es opcional: mantener null (no NaN) cuando el producto no tiene PVP
      const pvpNuevo = p.pvp_sugerido != null ? parseFloat(String(p.pvp_sugerido)) : null
      const pvpAnterior = prev?.pvp_sugerido ?? null
      const ivaRate = sku?.iva_rate ?? 0.22
      const precioCIva = Math.round(precioNuevo * (1 + ivaRate) * 100) / 100
      const aumento = (pvpAnterior != null && pvpNuevo != null) ? (pvpNuevo - pvpAnterior) / pvpAnterior : null

      return {
        ean: p.ean,
        cod_interno: sku?.cod_interno ?? '',
        cod_cadena: codCadenaPorSku[p.sku_id] ?? '',
        descripcion: sku?.descripcion ?? '',
        familia: sku?.familia ?? '',
        sub_familia: sku?.sub_familia ?? '',
        marca: sku?.marca ?? '',
        unidades_caja: sku?.unidades_caja ?? '',
        unidades_caja_tienda: udsTimedaPorSku[p.sku_id] ?? sku?.unidades_caja ?? null,
        iva_rate: ivaRate,
        tipo_iva: ivaRate === 0.10 ? 'Mínima' : ivaRate === 0.22 ? 'Básica' : 'Exento',
        precio_neto: precioNuevo,
        precio_c_iva: precioCIva,
        pvp_sugerido: pvpNuevo,
        precio_neto_anterior: prev?.precio_neto ?? null,
        precio_c_iva_anterior: prev ? Math.round(prev.precio_neto * (1 + ivaRate) * 100) / 100 : null,
        pvp_anterior: pvpAnterior,
        aumento_pct: aumento,
      }
    })

    // 6. Generar según formato
    let buffer: Buffer
    let filename: string

    const fecha = sim.vigencia_desde ?? new Date().toISOString().slice(0, 10)
    const nombreSim = (sim.nombre ?? `vigencia-${fecha}`).replace(/\s+/g, '-').toLowerCase()

    if (formato === 'xlsx_disco') {
      buffer = await generarDiscoXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = cadena.toUpperCase() === 'TATA'
        ? `lista-tata-${nombreSim}.xlsx`
        : `lista-disco-${cadena.toLowerCase()}-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_gdu') {
      buffer = await generarGduXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = `tabla-costos-gdu-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_tienda') {
      buffer = await generarTiendaXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = `lista-tienda-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_macro') {
      buffer = await generarMacroXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = `lista-macro-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_pedidosya') {
      buffer = await generarPedidosYaXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = `cambio-precios-pedidosya-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_comercio') {
      buffer = await generarComercioXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = `lista-comercio-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_interior') {
      buffer = await generarInteriorXlsx({ items, cadena, vigencia: fecha, nombre: sim.nombre })
      filename = `lista-interior-distribuidor-${nombreSim}.xlsx`
    } else if (formato === 'xlsx_importacion') {
      const importItems = items.map(i => ({
        cod_interno: i.cod_interno,
        precio_neto: i.precio_neto,
        pvp_sugerido: i.pvp_sugerido,
        iva_rate: i.iva_rate,
      }))
      buffer = await generarImportacionXlsx({ items: importItems, vigencia: fecha })
      filename = `importacion-${cadena.toLowerCase()}-${nombreSim}.xls`
    } else {
      return NextResponse.json({ error: `Formato desconocido: ${formato}` }, { status: 400 })
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error generando lista:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
