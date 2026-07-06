import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const familia = searchParams.get('familia')

    // Get all familias for the filter
    const { data: familias } = await supabase
      .from('gl_skus')
      .select('familia')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .not('familia', 'is', null)
      .order('familia')

    const familiasUnicas = [...new Set((familias ?? []).map((f) => f.familia).filter(Boolean))].sort()

    if (!familia) {
      return NextResponse.json({ familias: familiasUnicas, productos: [] })
    }

    // Get all skus for this familia with their segment
    const { data: skus, error } = await supabase
      .from('gl_skus')
      .select('id, descripcion, marca, gramaje, sub_familia, grupo_comparable, producto_id')
      .eq('tenant_id', TENANT_ID)
      .eq('familia', familia)
      .eq('activo', true)
      .order('marca')
      .order('descripcion')

    if (error) throw error

    // Get segment classifications
    const { data: segmentos } = await supabase
      .from('gl_marca_segmento')
      .select('marca, segmento')
      .eq('tenant_id', TENANT_ID)

    const segPorMarca: Record<string, string> = {}
    for (const s of segmentos ?? []) {
      segPorMarca[s.marca] = s.segmento
    }

    const productos = (skus ?? []).map((s) => ({
      id: s.id,
      descripcion: s.descripcion,
      marca: s.marca,
      gramaje: s.gramaje,
      sub_familia: s.sub_familia,
      grupo_comparable: s.grupo_comparable,
      segmento: s.marca ? segPorMarca[s.marca] ?? null : null,
    }))

    return NextResponse.json({ familias: familiasUnicas, productos })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const { cambios } = body as { cambios: { id: string; grupo_comparable: number | null }[] }

    // Update in batches
    for (const cambio of cambios) {
      const { error } = await supabase
        .from('gl_skus')
        .update({ grupo_comparable: cambio.grupo_comparable })
        .eq('id', cambio.id)
        .eq('tenant_id', TENANT_ID)

      if (error) throw error
    }

    return NextResponse.json({ ok: true, actualizados: cambios.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
