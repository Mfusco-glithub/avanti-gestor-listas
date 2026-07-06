import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''

    let query = supabase
      .from('gl_simulaciones')
      .select('id, nombre, cadena, vigencia_desde, estado, pct_global, pct_competencia, creado_por, family_targets, created_at, updated_at')
      .eq('tenant_id', TENANT_ID)
      .order('updated_at', { ascending: false })

    if (cadena) query = query.eq('cadena', cadena)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ simulaciones: data ?? [] })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    const { nombre, cadena, vigencia_desde, pct_global, pct_competencia, creado_por, family_targets, grupos_snapshot, items } = body as {
      nombre: string
      cadena: string
      vigencia_desde: string
      pct_global: number
      pct_competencia: number
      creado_por?: string | null
      family_targets?: Record<string, number>
      grupos_snapshot?: unknown
      items: {
        ean: string
        familia: string
        sub_familia: string
        descripcion: string
        pvp_base: number | null
        pct_aumento: number
        pvp_nuevo: number | null
        precio_neto: number
      }[]
    }

    // Crear simulación
    const { data: sim, error: simErr } = await supabase
      .from('gl_simulaciones')
      .insert({
        tenant_id: TENANT_ID,
        nombre,
        cadena,
        vigencia_desde,
        pct_global,
        pct_competencia,
        creado_por: creado_por ?? null,
        family_targets: family_targets ?? null,
        grupos_snapshot: grupos_snapshot ?? null,
        estado: 'borrador',
      })
      .select('id')
      .single()

    if (simErr) throw simErr

    // Insertar items
    if (items.length > 0) {
      const { error: itemsErr } = await supabase
        .from('gl_simulacion_items')
        .insert(items.map(it => ({ ...it, simulacion_id: sim.id })))
      if (itemsErr) throw itemsErr
    }

    return NextResponse.json({ id: sim.id, ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
