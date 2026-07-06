import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// GET /api/verificacion/historial?cadena=DISCO
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('gl_simulaciones')
      .select('id, cadena, nombre, vigencia_desde, estado, verificada_en, created_at')
      .eq('tenant_id', TENANT_ID)
      .in('estado', ['ejecutada', 'verificada'])
      .order('vigencia_desde', { ascending: false })

    if (cadena) query = query.eq('cadena', cadena)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ historial: data ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
