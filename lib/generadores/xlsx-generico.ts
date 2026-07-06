import ExcelJS from 'exceljs'

interface GeneradorParams {
  items: any[]
  cadena: any
  actualizacion: any
  cadenaSkus?: any[]
}

export async function generarExcelGenerico({ items, cadena, actualizacion }: GeneradorParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Lista de Precios')

  // Estilos
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }

  // Header de cadena/fecha
  ws.mergeCells('A1:G1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `AVANTI URUGUAY — Lista de Precios ${cadena.nombre}`
  titleCell.font = { bold: true, size: 12 }
  titleCell.alignment = { horizontal: 'center' }

  ws.mergeCells('A2:G2')
  ws.getCell('A2').value = `Vigencia: ${new Date(actualizacion.fecha_vigencia).toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' })}`
  ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.getCell('A2').font = { italic: true, size: 10 }

  ws.addRow([])

  // Cabecera columnas
  const headerRow = ws.addRow([
    'Cód. Barras (EAN)', 'Cód. Interno', 'Descripción', 'Gramaje',
    'Uds × Caja', 'Precio c/IVA', 'PVP Sugerido',
  ])
  headerRow.eachCell(cell => {
    cell.fill = headerFill
    cell.font = headerFont
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin' } }
  })
  headerRow.height = 20

  // Anchos de columna
  ws.columns = [
    { width: 16 }, // EAN
    { width: 12 }, // Cód interno
    { width: 40 }, // Descripción
    { width: 10 }, // Gramaje
    { width: 10 }, // Uds
    { width: 14 }, // Precio c/IVA
    { width: 14 }, // PVP sugerido
  ]

  // Datos agrupados por familia
  const byFamilia: Record<string, any[]> = {}
  items.forEach(item => {
    const fam = item.gl_skus?.familia ?? 'Sin categoría'
    if (!byFamilia[fam]) byFamilia[fam] = []
    byFamilia[fam].push(item)
  })

  const familiaFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }

  for (const [familia, famItems] of Object.entries(byFamilia)) {
    // Fila de familia
    const famRow = ws.addRow([familia.toUpperCase()])
    famRow.getCell(1).fill = familiaFill
    famRow.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF555555' } }
    ws.mergeCells(`A${famRow.number}:G${famRow.number}`)

    for (const item of famItems) {
      const sku = item.gl_skus
      const dataRow = ws.addRow([
        sku?.ean ?? '',
        sku?.cod_interno ?? '',
        sku?.descripcion ?? '',
        sku?.gramaje ?? '',
        sku?.unidades_caja ?? '',
        item.pvp_redondeado,
        item.pvp_redondeado, // PVP sugerido = mismo precio para genérico
      ])

      // Formato moneda en columnas de precio
      dataRow.getCell(6).numFmt = '"$"#,##0.00'
      dataRow.getCell(7).numFmt = '"$"#,##0.00'
      dataRow.font = { size: 9 }

      // Fila alternada
      if (famItems.indexOf(item) % 2 === 0) {
        dataRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
