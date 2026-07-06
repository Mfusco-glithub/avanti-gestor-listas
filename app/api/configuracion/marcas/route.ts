import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get distinct brands from pm_productos with product count
    const { data: productos, error: prodError } = await supabase
      .from('pm_productos')
      .select('marca')
      .not('marca', 'is', null)
      .order('marca')

    if (prodError) throw prodError

    // Count per marca
    const marcaCount: Record<string, number> = {}
    for (const p of productos ?? []) {
      if (p.marca) {
        marcaCount[p.marca] = (marcaCount[p.marca] ?? 0) + 1
      }
    }

    // Get current classifications
    const { data: clasificaciones, error: clasError } = await supabase
      .from('gl_marca_segmento')
      .select('*')
      .eq('tenant_id', TENANT_ID)

    if (clasError) throw clasError

    const clasPorMarca: Record<string, { id: string; segmento: string; activo: boolean }> = {}
    for (const c of clasificaciones ?? []) {
      clasPorMarca[c.marca] = { id: c.id, segmento: c.segmento, activo: c.activo }
    }

    // Merge
    const marcas = Object.entries(marcaCount)
      .map(([marca, count]) => ({
        marca,
        count,
        id: clasPorMarca[marca]?.id ?? null,
        segmento: clasPorMarca[marca]?.segmento ?? null,
        activo: clasPorMarca[marca]?.activo ?? true,
      }))
      .sort((a, b) => a.marca.localeCompare(b.marca))

    return NextResponse.json({ marcas })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const { cambios } = body as {
      cambios: { marca: string; segmento: string | null }[]
    }

    const toUpsert = cambios
      .filter((c) => c.segmento !== null)
      .map((c) => ({
        tenant_id: TENANT_ID,
        marca: c.marca,
        segmento: c.segmento as string,
        activo: true,
      }))

    const toDelete = cambios
      .filter((c) => c.segmento === null)
      .map((c) => c.marca)

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('gl_marca_segmento')
        .upsert(toUpsert, { onConflict: 'tenant_id,marca' })

      if (error) throw error
    }

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('gl_marca_segmento')
        .delete()
        .eq('tenant_id', TENANT_ID)
        .in('marca', toDelete)

      if (error) throw error
    }

    return NextResponse.json({ ok: true, upserted: toUpsert.length, deleted: toDelete.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
