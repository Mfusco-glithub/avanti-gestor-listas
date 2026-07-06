import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generarExcelGenerico } from '@/lib/generadores/xlsx-generico'
// xlsx-pedidosya migrado al nuevo sistema de simulaciones (listas/generar)
import { generarExcelGDU } from '@/lib/generadores/xlsx-gdu'
import { generarExcelKinko } from '@/lib/generadores/xlsx-kinko'

export async function POST(request: NextRequest) {
  try {
    const { actualizacionId, cadenaId } = await request.json()

    if (!actualizacionId || !cadenaId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Obtener datos necesarios
    const { data: cadena } = await supabase
      .from('gl_cadenas')
      .select('*')
      .eq('id', cadenaId)
      .single()

    if (!cadena) return NextResponse.json({ error: 'Cadena no encontrada' }, { status: 404 })

    const { data: actualizacion } = await supabase
      .from('gl_actualizaciones')
      .select('*')
      .eq('id', actualizacionId)
      .single()

    if (!actualizacion) return NextResponse.json({ error: 'Actualización no encontrada' }, { status: 404 })

    // Obtener items de esta cadena con datos de SKU
    const { data: items } = await supabase
      .from('gl_actualizacion_items')
      .select(`
        *,
        gl_skus (
          cod_interno, ean, descripcion, familia, sub_familia,
          marca, gramaje, unidades_caja, iva_rate
        )
      `)
      .eq('actualizacion_id', actualizacionId)
      .eq('cadena_id', cadenaId)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Sin ítems para esta cadena' }, { status: 404 })
    }

    // Obtener mapeos cod_interno_cadena para esta cadena
    const skuIds = items.map(i => i.sku_id)
    const { data: cadenaSkus } = await supabase
      .from('gl_cadena_skus')
      .select('*')
      .eq('cadena_id', cadenaId)
      .in('sku_id', skuIds)

    // Generar según formato
    let buffer: Buffer
    let filename: string
    let contentType: string

    const formato = cadena.formato_output ?? 'xlsx_generico'
    const nombreArchivo = `${cadena.nombre}_${actualizacion.nombre ?? actualizacion.fecha_vigencia}`
      .replace(/\s+/g, '-').toLowerCase()

    switch (formato) {
      // xlsx_pedidosya migrado al nuevo sistema (api/listas/generar)
      case 'xlsx_gdu':
        buffer = await generarExcelGDU({ items, cadena, actualizacion, cadenaSkus: cadenaSkus ?? [] })
        filename = `${nombreArchivo}-gdu.xlsx`
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
      case 'xlsx_kinko':
        buffer = await generarExcelKinko({ items, cadena, actualizacion })
        filename = `${nombreArchivo}-kinko.xlsx`
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
      default: // xlsx_generico
        buffer = await generarExcelGenerico({ items, cadena, actualizacion })
        filename = `${nombreArchivo}.xlsx`
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }

    // Guardar referencia en BD
    const filePath = `actualizaciones/${actualizacionId}/${filename}`
    await supabase.storage.from('gl-archivos').upload(filePath, buffer, {
      contentType,
      upsert: true,
    })

    await supabase.from('gl_archivos').upsert({
      actualizacion_id: actualizacionId,
      cadena_id: cadenaId,
      tipo: 'excel',
      url: filePath,
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generando archivo:', error)
    return NextResponse.json({ error: 'Error generando el archivo' }, { status: 500 })
  }
}
