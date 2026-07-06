import ExcelJS from 'exceljs'

interface GeneradorParams { items: any[]; cadena: any; actualizacion: any }

export async function generarExcelKinko({ items, cadena, actualizacion }: GeneradorParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Kinko')

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF57C00' } }

  ws.columns = [
    { header: 'Cód. Barras', key: 'ean', width: 16 },
    { header: 'Cód. Interno', key: 'cod_interno', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Uds × Caja', key: 'uds_caja', width: 10 },
    { header: 'Precio s/IVA', key: 'precio_siva', width: 14 },
    { header: 'Precio c/IVA', key: 'precio_civa', width: 14 },
    { header: 'PVP Sugerido', key: 'pvp_sugerido', width: 14 },
  ]

  ws.getRow(1).eachCell(cell => {
    cell.fill = headerFill
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ws.getRow(1).height = 22

  for (const item of items) {
    const sku = item.gl_skus
    const row = ws.addRow({
      ean: sku?.ean ?? '',
      cod_interno: sku?.cod_interno ?? '',
      descripcion: sku?.descripcion ?? '',
      uds_caja: sku?.unidades_caja ?? '',
      precio_siva: item.pvp_sin_iva,
      precio_civa: item.pvp_redondeado,
      pvp_sugerido: item.pvp_redondeado,
    })
    row.getCell('precio_siva').numFmt = '"$"#,##0.00'
    row.getCell('precio_civa').numFmt = '"$"#,##0.00'
    row.getCell('pvp_sugerido').numFmt = '"$"#,##0.00'
    row.font = { size: 9 }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
