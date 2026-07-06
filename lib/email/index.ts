import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EnviarListaParams {
  cadena: {
    nombre: string
    contacto_email: string[]
  }
  actualizacion: {
    nombre: string | null
    fecha_vigencia: string
  } | null
  archivoUrl?: string
  supabase?: any
}

export async function enviarListaPreciosCadena({
  cadena,
  actualizacion,
  archivoUrl,
  supabase,
}: EnviarListaParams) {
  const nombreActualizacion = actualizacion?.nombre ?? `Vigencia ${actualizacion?.fecha_vigencia ?? ''}`
  const fechaVigencia = actualizacion?.fecha_vigencia
    ? new Date(actualizacion.fecha_vigencia).toLocaleDateString('es-UY', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : ''

  const asunto = `Lista de Precios Avanti Uruguay — ${nombreActualizacion}`

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #D32F2F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Avanti Uruguay</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">Lista de Precios Actualizada</p>
  </div>
  
  <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-top: none; padding: 25px; border-radius: 0 0 8px 8px;">
    <p>Estimado equipo de <strong>${cadena.nombre}</strong>,</p>
    
    <p>Adjunto encontrarán la lista de precios actualizada de Avanti Uruguay.</p>
    
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #666;">Detalles de la actualización:</p>
      <p style="margin: 0; font-weight: bold;">${nombreActualizacion}</p>
      ${fechaVigencia ? `<p style="margin: 5px 0 0; color: #666; font-size: 13px;">Vigente a partir del: ${fechaVigencia}</p>` : ''}
    </div>
    
    <p>Ante cualquier consulta, no dude en contactarnos.</p>
    
    <p style="margin-top: 25px;">Saludos,<br>
    <strong>Equipo Comercial Avanti Uruguay</strong></p>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 11px; margin-top: 15px;">
    Este email fue generado automáticamente por el Sistema de Gestión Comercial Avanti
  </p>
</body>
</html>
`

  // TODO: Para adjuntar el archivo, descargar de Supabase Storage y adjuntar
  // Por ahora enviamos sin adjunto (el archivo se descarga manualmente)
  const { data, error } = await resend.emails.send({
    from: 'Avanti Uruguay <comercial@avanti.com.uy>',
    to: cadena.contacto_email,
    subject: asunto,
    html: htmlBody,
  })

  if (error) {
    console.error('Error enviando email:', error)
    throw new Error(error.message)
  }

  return data
}
