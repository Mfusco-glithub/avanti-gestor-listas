import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calcularPVP } from '@/lib/calculadora-precios'
import * as XLSX from 'xlsx'

interface ItemIngenieria {
  cod_interno: string
  descripcion: string
  pcosto_nuevo: number
}

/**
 * Parsea el archivo XLS/XLSX de ingeniería de precios de Avanti.
 * Soporta dos formatos:
 * 1. Formato estándar: headers en fila 1 con cod_interno, descripcion, pcosto_nuevo
 * 2. Formato real Avanti: headers en fila 6/7 con CODIGOS, PRODUCTOS, P.COSTO Sin.Imp.
 */
function parsearArchivo(workbook: XLSX.WorkBook): ItemIngenieria[] {
  const ws = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Buscar la fila de headers (contiene "CODIGOS" o "cod_interno")
  let headerRowIdx = -1
  let colCodigo = -1
  let colDescripcion = -1
  let colPcosto = -1

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i].map((v: any) => String(v).toLowerCase().trim())
    
    // Formato real Avanti: buscar "codigos" y "productos"
    const codigosIdx = row.findIndex(v => v === 'codigos' || v === 'código' || v === 'cod.')
    const productosIdx = row.findIndex(v => v === 'productos' || v === 'producto' || v === 'descripcion' || v === 'descripción')
    
    if (codigosIdx >= 0 && productosIdx >= 0) {
      headerRowIdx = i
      colCodigo = codigosIdx
      colDescripcion = productosIdx
      // Buscar columna P.COSTO en esta fila o la siguiente
      const pcostoIdx = row.findIndex(v => v.includes('p.costo') || v.includes('pcosto') || v === 'costo')
      if (pcostoIdx >= 0) {
        colPcosto = pcostoIdx
      } else {
        // Buscar en la fila siguiente (subheader "Sin.Imp.")
        const nextRow = rows[i + 1]?.map((v: any) => String(v).toLowerCase().trim()) ?? []
        // P.COSTO está en col 5 en el formato Avanti — verificar con "sin.imp."
        const sinImpIdx = nextRow.findIndex((v: string) => v.includes('sin.imp') || v.includes('sin imp') || v.includes('costo'))
        if (sinImpIdx >= 0) {
          colPcosto = sinImpIdx
        }
      }
      break
    }

    // Formato simple: buscar "cod_interno"
    const codInternoIdx = row.findIndex(v => v === 'cod_interno' || v === 'cod interno' || v === 'cod. interno')
    if (codInternoIdx >= 0) {
      headerRowIdx = i
      colCodigo = codInternoIdx
      colDescripcion = row.findIndex(v => v === 'descripcion' || v === 'descripción' || v === 'producto')
      colPcosto = row.findIndex(v => v === 'pcosto_nuevo' || v === 'costo nuevo' || v === 'p_costo_nuevo' || v.includes('pcosto'))
      break
    }
  }

  if (headerRowIdx === -1) {
    // Fallback: asumir formato Avanti con col fija: 0=codigo, 1=descripcion, 5=pcosto
    headerRowIdx = 6
    colCodigo = 0
    colDescripcion = 1
    colPcosto = 5
  }

  if (colPcosto === -1) colPcosto = 5 // default Avanti

  const items: ItemIngenieria[] = []

  for (let i = headerRowIdx + 2; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const rawCod = row[colCodigo]
    const rawDesc = row[colDescripcion]
    const rawCosto = row[colPcosto]

    if (!rawCod || !rawDesc) continue

    const cod = String(rawCod).trim().replace('.0', '').replace(/\.0$/, '')
    const desc = String(rawDesc).trim()
    const costo = typeof rawCosto === 'number' ? rawCosto : parseFloat(String(rawCosto).replace(',', '.'))

    if (!cod || !desc || isNaN(costo) || costo <= 0) continue
    // Saltear filas de categoría (solo texto, sin código numérico)
    if (isNaN(parseFloat(cod)) && !/^\d/.test(cod)) continue

    items.push({ cod_interno: cod, descripcion: desc, pcosto_nuevo: costo })
  }

  return items
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const nombre = formData.get('nombre') as string
    const fechaVigencia = formData.get('fechaVigencia') as string

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Leer con SheetJS (soporta .xls y .xlsx)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const itemsIngenieria = parsearArchivo(workbook)

    if (itemsIngenieria.length === 0) {
      return NextResponse.json({
        error: 'El archivo no tiene datos válidos. Se esperan columnas: CODIGOS, PRODUCTOS, P.COSTO (o cod_interno, descripcion, pcosto_nuevo)'
      }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: tenant } = await supabase
      .from('gl_tenants')
      .select('id')
      .eq('slug', 'avanti')
      .single()

    const tenantId = tenant?.id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })
    }

    const { data: actualizacion, error: errAct } = await supabase
      .from('gl_actualizaciones')
      .insert({
        tenant_id: tenantId,
        nombre,
        fecha_vigencia: fechaVigencia,
        estado: 'borrador',
      })
      .select()
      .single()

    if (errAct || !actualizacion) {
      return NextResponse.json({ error: 'Error creando actualización' }, { status: 500 })
    }

    const { data: skus } = await supabase
      .from('gl_skus')
      .select('id, cod_interno, descripcion, iva_rate')
      .eq('tenant_id', tenantId)
      .eq('activo', true)

    const { data: cadenas } = await supabase
      .from('gl_cadenas')
      .select('id, nombre, descuento_pct, margen_markup_pct, calculo_base')
      .eq('tenant_id', tenantId)
      .eq('activo', true)

    const { data: reglas } = await supabase
      .from('gl_reglas_posicionamiento')
      .select('*')
      .eq('tenant_id', tenantId)

    const itemsCalculados: any[] = []
    const itemsUI: any[] = []

    for (const item of itemsIngenieria) {
      const sku = skus?.find(s => s.cod_interno === item.cod_interno)
      if (!sku) continue

      for (const cadena of (cadenas ?? [])) {
        const regla = reglas?.find(r =>
          r.cadena_id === cadena.id && (!r.vigente_hasta || r.vigente_hasta >= fechaVigencia)
        ) ?? reglas?.find(r =>
          !r.cadena_id && (!r.vigente_hasta || r.vigente_hasta >= fechaVigencia)
        )

        const tipoRegla = regla?.tipo_regla ?? 'margen_fijo'
        const margenObjetivo = regla?.margen_objetivo_pct ?? (cadena.margen_markup_pct ?? 0.35)

        try {
          const resultado = calcularPVP({
            pcosto_nuevo: item.pcosto_nuevo,
            iva_rate: sku.iva_rate,
            tipo_regla: tipoRegla,
            margen_objetivo_pct: margenObjetivo,
          })

          itemsCalculados.push({
            actualizacion_id: actualizacion.id,
            sku_id: sku.id,
            cadena_id: cadena.id,
            pcosto_nuevo: item.pcosto_nuevo,
            pvp_bruto: resultado.pvp_bruto_con_iva,
            pvp_redondeado: resultado.pvp_redondeado,
            pvp_sin_iva: resultado.pvp_sin_iva,
            fraccion_empresa: resultado.fraccion_empresa,
            margen_pct: resultado.margen_pct,
            delta_pvp_pct: resultado.delta_pvp_pct,
          })

          itemsUI.push({
            sku_id: sku.id,
            cod_interno: item.cod_interno,
            descripcion: item.descripcion,
            cadena_id: cadena.id,
            cadena_nombre: cadena.nombre,
            pcosto_anterior: null,
            pcosto_nuevo: item.pcosto_nuevo,
            delta_costo_pct: null,
            pvp_anterior: null,
            pvp_redondeado: resultado.pvp_redondeado,
            pvp_sin_iva: resultado.pvp_sin_iva,
            delta_pvp_pct: resultado.delta_pvp_pct,
            margen_pct: resultado.margen_pct,
            fraccion_empresa: resultado.fraccion_empresa,
            ajuste_manual: false,
          })
        } catch { /* skip */ }
      }
    }

    if (itemsCalculados.length > 0) {
      for (let i = 0; i < itemsCalculados.length; i += 100) {
        await supabase.from('gl_actualizacion_items').insert(itemsCalculados.slice(i, i + 100))
      }
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `actualizaciones/${actualizacion.id}/ingenieria.${fileExt}`
    await supabase.storage.from('gl-archivos').upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })

    await supabase
      .from('gl_actualizaciones')
      .update({ archivo_ingenieria_url: filePath })
      .eq('id', actualizacion.id)

    return NextResponse.json({
      actualizacionId: actualizacion.id,
      nombre,
      fechaVigencia,
      items: itemsUI,
      totalItems: itemsUI.length,
    })
  } catch (error) {
    console.error('Error en cálculo:', error)
    return NextResponse.json({ error: 'Error procesando la actualización' }, { status: 500 })
  }
}
