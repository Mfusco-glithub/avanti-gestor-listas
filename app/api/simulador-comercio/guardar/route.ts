import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// POST /api/simulador-comercio/guardar
// Guarda la simulación como borrador en gl_simulaciones + gl_simulacion_items
export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createAdminClient() as any
    const body = await request.json()

    const { nombre, cadena, vigencia_desde, creado_por, items } = body as {
      nombre: string
      cadena: string
      vigencia_desde: string
      creado_por?: string | null
      items: {
        ean: string
        familia: string
        subfamilia: string
        descripcion: string
        pvp_sugerido_actual: number | null
        pvp_sugerido_sim: number | null
        precio_neto_actual: number
        precio_neto_sim: number
        var_pct: number | null
      }[]
    }

    if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!vigencia_desde) return NextResponse.json({ error: 'Vigencia requerida' }, { status: 400 })
    if (!cadena) return NextResponse.json({ error: 'Cadena requerida' }, { status: 400 })
    if (!items?.length) return NextResponse.json({ error: 'Sin items para guardar' }, { status: 400 })

    // Crear simulación
    const { data: sim, error: simErr } = await supabase
      .from('gl_simulaciones')
      .insert({
        tenant_id: TENANT_ID,
        nombre: nombre.trim(),
        cadena,
        vigencia_desde,
        pct_global: 0,
        pct_competencia: 0,
        creado_por: creado_por ?? null,
        estado: 'borrador',
      })
      .select('id')
      .single()

    if (simErr) throw simErr

    // Insertar items
    // precio_neto almacena precio_neto_sim (ya es el nuevo neto).
    // pvp_base = pvp_sugerido_actual, pvp_nuevo = pvp_sugerido_sim.
    const rows = items.map(it => ({
      simulacion_id: sim.id,
      ean: it.ean,
      familia: it.familia,
      sub_familia: it.subfamilia,
      descripcion: it.descripcion,
      pvp_base: it.pvp_sugerido_actual,
      pvp_nuevo: it.pvp_sugerido_sim,
      precio_neto: it.precio_neto_sim,   // neto simulado directo
      pct_aumento: it.var_pct ?? 0,
    }))

    const { error: itemsErr } = await supabase
      .from('gl_simulacion_items')
      .insert(rows)
    if (itemsErr) throw itemsErr

    return NextResponse.json({ id: sim.id, ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[guardar-comercio] error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
