import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// POST /api/simulaciones/[id]/ejecutar
// Escribe pvp_nuevo en gl_lista_precios y marca la simulación como ejecutada
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createAdminClient() as any
    const { id } = await params

    // Cargar simulación
    const { data: sim, error: simErr } = await supabase
      .from('gl_simulaciones')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
      .single()
    if (simErr) throw simErr
    if (sim.estado === 'ejecutada') {
      return NextResponse.json({ error: 'La simulación ya fue ejecutada' }, { status: 400 })
    }

    // Cargar items
    const { data: items, error: itemsErr } = await supabase
      .from('gl_simulacion_items')
      .select('ean, pvp_base, pvp_nuevo, precio_neto')
      .eq('simulacion_id', id)
    if (itemsErr) throw itemsErr

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'La simulación no tiene items' }, { status: 400 })
    }

    // Para cada item, obtener sku_id y actualizar / insertar en gl_lista_precios
    const eans = items.map((it: any) => it.ean)
    const { data: skus } = await supabase
      .from('gl_skus')
      .select('id, ean, familia, iva_rate')
      .eq('tenant_id', TENANT_ID)
      .in('ean', eans)

    const skuInfoPorEan: Record<string, { id: string; familia: string; iva_rate: number }> = {}
    for (const s of (skus ?? []) as any[]) {
      if (s.ean) skuInfoPorEan[s.ean] = {
        id: s.id,
        familia: s.familia ?? '',
        iva_rate: s.iva_rate ? parseFloat(String(s.iva_rate)) : 0.22,
      }
    }

    // Dedup por EAN (puede haber duplicados si la simulación se recalculó con precios distintos)
    // Quedarse con el que tenga precio_neto (más completo) o el mayor pvp_nuevo
    const itemsPorEan = new Map<string, any>()
    for (const it of items as any[]) {
      if (!it.pvp_nuevo || !skuInfoPorEan[it.ean]) continue
      const existing = itemsPorEan.get(it.ean)
      if (!existing || (!existing.precio_neto && it.precio_neto) || (it.pvp_nuevo > (existing.pvp_nuevo ?? 0))) {
        itemsPorEan.set(it.ean, it)
      }
    }

    // Upsert en gl_lista_precios
    const upserts = Array.from(itemsPorEan.values()).map((it: any) => {
      const info = skuInfoPorEan[it.ean]
      // Precio neto nuevo: proporcional al aumento de PVP (precio_neto × pvp_nuevo / pvp_base)
      const precioNetoNuevo = it.precio_neto && it.pvp_base && it.pvp_base > 0
        ? Math.round(it.precio_neto * it.pvp_nuevo / it.pvp_base * 100) / 100
        : it.precio_neto
      // precio_iva: siempre precio_neto × (1 + iva_rate)
      const precioIva = precioNetoNuevo !== null && precioNetoNuevo !== undefined
        ? Math.round(precioNetoNuevo * (1 + (info?.iva_rate ?? 0.22)) * 100) / 100
        : null
      return {
        tenant_id: TENANT_ID,
        cadena: sim.cadena,
        sku_id: info?.id,
        ean: it.ean,
        precio_neto: precioNetoNuevo,
        precio_iva: precioIva,
        pvp_sugerido: it.pvp_nuevo,
        vigencia_desde: sim.vigencia_desde,
      }
    })

    if (upserts.length > 0) {
      const { error: upsErr } = await supabase
        .from('gl_lista_precios')
        .upsert(upserts, { onConflict: 'tenant_id,cadena,sku_id,vigencia_desde' })
      if (upsErr) throw upsErr
    }

    // Marcar simulación como ejecutada
    await supabase
      .from('gl_simulaciones')
      .update({ estado: 'ejecutada' })
      .eq('id', id)

    return NextResponse.json({ ok: true, actualizados: upserts.length })
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : (error as { message?: string })?.message ?? JSON.stringify(error) ?? 'Error desconocido'
    console.error('[ejecutar] error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
