import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// v2 - usa createAdminClient para escrituras
const TENANT_ID = '00000000-0000-0000-0000-000000000001'

const FAMILIAS_DISPONIBLES = [
  'Masas',
  'Empanadas Congeladas',
  'Pizzas Congeladas',
  'Pastas Congeladas',
  'Pastas Frescas ATM',
  'Pastas Frescas',
  'Salsas',
]

// Normalizar nombres de cadena (gl_lista_precios usa mayusculas, pm_monitoring usa nombre legible)
const CADENA_NORMALIZAR: Record<string, string> = {
  DISCO: 'Disco',
  DEVOTO: 'Devoto',
  GEANT: 'Geant',
  TATA: 'Ta-Ta',
  TIENDA: 'Tienda Inglesa',
  MACRO: 'Macro',
}

function normalizarCadena(c: string): string {
  return CADENA_NORMALIZAR[c] ?? c
}

export async function GET() {
  try {
    const supabase = await createClient()

    const [{ data: pmCadenas }, { data: lpCadenas }] = await Promise.all([
      supabase.from('pm_monitoring').select('cadena').eq('activo', true),
      supabase.from('gl_lista_precios').select('cadena').eq('tenant_id', TENANT_ID),
    ])

    const cadenas = [
      ...new Set([
        ...(pmCadenas ?? []).map((r) => normalizarCadena(r.cadena)),
        ...(lpCadenas ?? []).map((r) => normalizarCadena(r.cadena)),
      ]),
    ]
      .filter(Boolean)
      .sort()

    const { data: descuentos } = await supabase
      .from('gl_descuento_cadena')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .is('vigencia_hasta', null)
      .order('cadena')
      .order('familia')

    return NextResponse.json({ cadenas, descuentos: descuentos ?? [], familias: FAMILIAS_DISPONIBLES })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const { action, cadena, familia, descuento_pct, id } = body

    if (action === 'upsert') {
      if (!cadena || !descuento_pct) {
        return NextResponse.json({ error: 'cadena y descuento_pct son requeridos' }, { status: 400 })
      }
      const { error } = await supabase.from('gl_descuento_cadena').upsert({
        tenant_id: TENANT_ID,
        cadena,
        familia: familia || null,
        descuento_pct: parseFloat(descuento_pct),
        vigencia_desde: new Date().toISOString().split('T')[0],
        vigencia_hasta: null,
      }, { onConflict: 'tenant_id,cadena,familia,vigencia_desde' })

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
      const { error } = await supabase
        .from('gl_descuento_cadena')
        .delete()
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'action invalida' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
