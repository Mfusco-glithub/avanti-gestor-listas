import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarListaPreciosCadena } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { actualizacionId, cadenaId } = await request.json()
    const supabase = await createAdminClient()

    const { data: cadena } = await supabase
      .from('gl_cadenas')
      .select('*')
      .eq('id', cadenaId)
      .single()

    if (!cadena) return NextResponse.json({ error: 'Cadena no encontrada' }, { status: 404 })
    if (!cadena.contacto_email?.length) {
      return NextResponse.json({ error: 'Cadena sin email de contacto configurado' }, { status: 400 })
    }

    const { data: actualizacion } = await supabase
      .from('gl_actualizaciones')
      .select('*')
      .eq('id', actualizacionId)
      .single()

    const { data: archivo } = await supabase
      .from('gl_archivos')
      .select('url')
      .eq('actualizacion_id', actualizacionId)
      .eq('cadena_id', cadenaId)
      .single()

    await supabase.from('gl_envios').insert({
      actualizacion_id: actualizacionId,
      cadena_id: cadenaId,
      destinatarios: cadena.contacto_email,
      asunto: `Lista de Precios Avanti - ${actualizacion?.nombre ?? actualizacion?.fecha_vigencia}`,
      estado: 'pendiente',
    })

    // Enviar email
    await enviarListaPreciosCadena({
      cadena,
      actualizacion,
      archivoUrl: archivo?.url,
      supabase,
    })

    // Actualizar estado del envío
    await supabase
      .from('gl_envios')
      .update({ estado: 'enviado', enviado_at: new Date().toISOString() })
      .eq('actualizacion_id', actualizacionId)
      .eq('cadena_id', cadenaId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enviando email:', error)
    return NextResponse.json({ error: 'Error enviando el email' }, { status: 500 })
  }
}
