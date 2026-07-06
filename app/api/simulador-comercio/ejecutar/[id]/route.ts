import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// POST /api/simulador-comercio/ejecutar/[id]
// Escribe los precios simulados en gl_lista_precios y marca la simulación como ejecutada.
// A diferencia del ejecutar de cadenas, usa precio_neto directamente (ya es el neto simulado).
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
      .select('ean, pvp_nuevo, precio_neto')
      .eq('simulacion_id', id)
    if (itemsErr) throw itemsErr

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'La simulación no tiene items' }, { status: 400 })
    }

    // Cargar info de SKUs (id para sku_id, familia para lógica Masas, iva_rate)
    const eans = (items as { ean: string }[]).map(it => it.ean)
    const { data: skus } = await supabase
      .from('gl_skus')
      .select('id, ean, familia, iva_rate')
      .eq('tenant_id', TENANT_ID)
      .in('ean', eans)

    const skuInfoPorEan: Record<string, { id: string; familia: string; iva_rate: number }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (skus ?? []) as any[]) {
      if (s.ean) skuInfoPorEan[s.ean] = {
        id: s.id,
        familia: s.familia ?? '',
        iva_rate: s.iva_rate ? parseFloat(String(s.iva_rate)) : 0.22,
      }
    }

    // Upsert en gl_lista_precios
    // precio_neto ya almacena el valor simulado (precio_neto_sim guardado por /guardar).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upserts = (items as any[])
      .filter(it => it.pvp_nuevo && skuInfoPorEan[it.ean])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => {
        const info = skuInfoPorEan[it.ean]
        const precioNeto: number | null = it.precio_neto
        // precio_iva: Masas = pvp_nuevo (convención); otros = precio_neto × (1 + iva_rate)
        const precioIva = info.familia === 'Masas'
          ? it.pvp_nuevo
          : precioNeto != null
            ? Math.round(precioNeto * (1 + (info.iva_rate ?? 0.22)) * 100) / 100
            : null
        return {
          tenant_id: TENANT_ID,
          cadena: sim.cadena,
          sku_id: info.id,
          ean: it.ean,
          precio_neto: precioNeto,
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

    // Marcar como ejecutada
    const { error: updErr } = await supabase
      .from('gl_simulaciones')
      .update({ estado: 'ejecutada' })
      .eq('id', id)
    if (updErr) throw updErr

    return NextResponse.json({ ok: true, actualizados: upserts.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[ejecutar-comercio] error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
