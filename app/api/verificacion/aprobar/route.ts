import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// POST /api/verificacion/aprobar
// Body: { simulacion_id: string }
export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json() as { simulacion_id: string }
    const { simulacion_id } = body

    if (!simulacion_id) {
      return NextResponse.json({ error: 'Falta simulacion_id' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('gl_simulaciones')
      .update({
        verificada_en: new Date().toISOString(),
        estado: 'verificada',
      })
      .eq('id', simulacion_id)
      .eq('tenant_id', TENANT_ID)
      .select('id, cadena, nombre, vigencia_desde, verificada_en, estado')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, simulacion: data })
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : 'Error desconocido'
    console.error('Error aprobando verificacion:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
