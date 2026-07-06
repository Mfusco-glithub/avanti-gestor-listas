import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarComercioXlsx } from '@/lib/generadores/xlsx-comercio'
import { generarInteriorXlsx } from '@/lib/generadores/xlsx-interior'
import { generarPedidosYaXlsx } from '@/lib/generadores/xlsx-pedidosya'
import { generarImportacionXlsx } from '@/lib/generadores/xlsx-importacion'

export const dynamic = 'force-dynamic'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

interface ItemInput {
  ean: string
  precio_neto: number
  pvp_sugerido: number | null
}

// POST /api/simulador-comercio/generar
// Body: { cadena: string, items: [{ean, precio_neto, pvp_sugerido}] }
// Genera un xlsx con los precios simulados y los precios actuales como "anteriores"
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any
    const body = await request.json() as { cadena: string; items: ItemInput[]; formato?: string }
    const { cadena, items: itemsInput, formato } = body

    if (!cadena || !itemsInput?.length) {
      return NextResponse.json({ error: 'Faltan parámetros: cadena e items son requeridos' }, { status: 400 })
    }

    const eans = itemsInput.map(i => i.ean)

    // 1. Info de SKUs (descripcion, familia, marca, iva_rate, unidades_caja)
    const { data: skusRaw } = await supabase
      .from('gl_skus')
      .select('ean, cod_interno, descripcion, familia, sub_familia, marca, iva_rate, unidades_caja')
      .eq('tenant_id', TENANT_ID)
      .in('ean', eans)

    const skuPorEan: Record<string, {
      cod_interno: string; descripcion: string; familia: string
      sub_familia: string; marca: string; iva_rate: number; unidades_caja: string
    }> = {}
    for (const s of skusRaw ?? []) {
      skuPorEan[s.ean] = {
        cod_interno: s.cod_interno ?? '',
        descripcion: s.descripcion ?? '',
        familia: s.familia ?? '',
        sub_familia: s.sub_familia ?? '',
        marca: s.marca ?? '',
        iva_rate: s.iva_rate ? parseFloat(String(s.iva_rate)) : 0.22,
        unidades_caja: s.unidades_caja ?? '',
      }
    }

    // 2. Simulación más reciente → vigencia actual como "precios anteriores"
    const { data: simRow } = await supabase
      .from('gl_simulaciones')
      .select('vigencia_desde, nombre')
      .eq('tenant_id', TENANT_ID)
      .eq('cadena', cadena)
      .in('estado', ['ejecutada', 'verificada'])
      .order('vigencia_desde', { ascending: false })
      .limit(1)
      .single()

    // 3. Precios actuales (vigencia de la sim) → se muestran como "anteriores" en el xlsx
    const prevPorEan: Record<string, { precio_neto: number; pvp_sugerido: number }> = {}

    if (simRow?.vigencia_desde) {
      const { data: prevRaw } = await supabase
        .from('gl_lista_precios')
        .select('ean, precio_neto, pvp_sugerido')
        .eq('tenant_id', TENANT_ID)
        .eq('cadena', cadena)
        .eq('vigencia_desde', simRow.vigencia_desde)
        .in('ean', eans)

      for (const p of prevRaw ?? []) {
        prevPorEan[p.ean] = {
          precio_neto: parseFloat(String(p.precio_neto)),
          pvp_sugerido: p.pvp_sugerido ? parseFloat(String(p.pvp_sugerido)) : 0,
        }
      }
    }

    // 4. Armar array de items para el generador
    const items = itemsInput
      .filter(i => skuPorEan[i.ean])
      .map(i => {
        const sku     = skuPorEan[i.ean]
        const ivaRate = sku.iva_rate
        const neto    = i.precio_neto
        const pvp     = i.pvp_sugerido ?? 0
        const cIva    = Math.round(neto * (1 + ivaRate) * 100) / 100
        const prev    = prevPorEan[i.ean]

        return {
          ean: i.ean,
          cod_interno: sku.cod_interno,
          descripcion: sku.descripcion,
          familia: sku.familia,
          sub_familia: sku.sub_familia,
          marca: sku.marca,
          unidades_caja: sku.unidades_caja,
          unidades_caja_tienda: null,
          iva_rate: ivaRate,
          precio_neto: neto,
          precio_c_iva: cIva,
          pvp_sugerido: pvp,
          precio_neto_anterior: prev?.precio_neto ?? null,
          precio_c_iva_anterior: prev
            ? Math.round(prev.precio_neto * (1 + ivaRate) * 100) / 100
            : null,
          pvp_anterior: prev?.pvp_sugerido ?? null,
        }
      })

    if (!items.length) {
      return NextResponse.json({ error: 'Sin items válidos para generar' }, { status: 404 })
    }

    // 5. Generar Excel según canal
    const vigenciaLabel = simRow?.vigencia_desde ?? new Date().toISOString().slice(0, 10)
    const fecha         = new Date().toISOString().slice(0, 10)
    const cadenaUpper   = cadena.toUpperCase()

    let buffer: Buffer
    let filename: string

    if (formato === 'importacion') {
      const importItems = items.map(i => ({
        cod_interno: i.cod_interno,
        precio_neto: i.precio_neto,
        pvp_sugerido: i.pvp_sugerido,
        iva_rate: i.iva_rate,
      }))
      buffer   = await generarImportacionXlsx({ items: importItems, vigencia: vigenciaLabel })
      filename = `importacion-${cadenaUpper.toLowerCase()}-${fecha}.xls`
    } else if (cadenaUpper === 'INTERIOR') {
      buffer   = await generarInteriorXlsx({ items, cadena, vigencia: vigenciaLabel, nombre: simRow?.nombre ?? null })
      filename = `simulacion-interior-${fecha}.xlsx`
    } else if (cadenaUpper === 'PEDIDOSYA') {
      const pyItems = items.map(i => ({
        ...i,
        cod_cadena: '',
        aumento_pct: i.precio_neto_anterior !== null
          ? (i.precio_neto - i.precio_neto_anterior) / i.precio_neto_anterior
          : null,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buffer   = await generarPedidosYaXlsx({ items: pyItems as any, cadena, vigencia: vigenciaLabel, nombre: simRow?.nombre ?? null })
      filename = `cambio-precios-pedidosya-${fecha}.xlsx`
    } else {
      buffer   = await generarComercioXlsx({ items, cadena, vigencia: vigenciaLabel, nombre: simRow?.nombre ?? null })
      filename = `simulacion-${cadenaUpper.toLowerCase()}-${fecha}.xlsx`
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[simulador-comercio/generar]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
