import ExcelJS from 'exceljs'

interface GeneradorParams { items: any[]; cadena: any; actualizacion: any; cadenaSkus: any[] }

export async function generarExcelGDU({ items, cadena, actualizacion, cadenaSkus }: GeneradorParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('GDU')

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }

  ws.columns = [
    { header: 'Referencia', key: 'referencia', width: 14 },
    { header: 'Código GDU', key: 'cod_gdu', width: 14 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Precio Lista Actual', key: 'precio_actual', width: 18 },
    { header: 'Tipo IVA', key: 'tipo_iva', width: 12 },
    { header: 'Costo Actual', key: 'costo_actual', width: 14 },
    { header: 'Nuevo Precio Lista', key: 'nuevo_precio', width: 18 },
    { header: 'Nuevo Costo', key: 'nuevo_costo', width: 14 },
    { header: 'Variación %', key: 'variacion_pct', width: 12 },
    { header: 'Fecha Vigencia', key: 'fecha_vigencia', width: 14 },
  ]

  ws.getRow(1).eachCell(cell => {
    cell.fill = headerFill
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(1).height = 28

  for (const item of items) {
    const sku = item.gl_skus
    const cadenaSkuMap = cadenaSkus.find(cs => cs.sku_id === item.sku_id)
    const codGdu = cadenaSkuMap?.cod_interno_cadena ?? ''
    const tipoIva = sku?.iva_rate === 0.10 ? 'Mínima' : sku?.iva_rate === 0.22 ? 'Básica' : 'Exento'

    const row = ws.addRow({
      referencia: sku?.cod_interno ?? '',
      cod_gdu: codGdu,
      descripcion: sku?.descripcion ?? '',
      precio_actual: item.pvp_anterior,
      tipo_iva: tipoIva,
      costo_actual: item.pcosto_anterior,
      nuevo_precio: item.pvp_redondeado,
      nuevo_costo: item.pcosto_nuevo,
      variacion_pct: item.delta_pvp_pct ? `${(item.delta_pvp_pct * 100).toFixed(1)}%` : '—',
      fecha_vigencia: actualizacion.fecha_vigencia,
    })

    row.getCell('precio_actual').numFmt = '"$"#,##0.00'
    row.getCell('costo_actual').numFmt = '"$"#,##0.00'
    row.getCell('nuevo_precio').numFmt = '"$"#,##0.00'
    row.getCell('nuevo_costo').numFmt = '"$"#,##0.00'
    row.font = { size: 9 }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
