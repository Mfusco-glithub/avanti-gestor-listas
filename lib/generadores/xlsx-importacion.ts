/**
 * Generador lista de IMPORTACIÓN AL SISTEMA
 * Formato estándar para importar precios a cada cadena/cliente.
 * Estructura fija: vigencia (B1), iva/cantidad compra (fila 2),
 * cabeceras (fila 3), datos desde fila 4.
 */
import ExcelJS from 'exceljs'
import { codigoExportacion } from './codigo-exportacion'

interface Item {
  cod_interno: string | number
  precio_neto: number
  pvp_sugerido: number
  iva_rate: number
}

interface Params {
  items: Item[]
  vigencia: string
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const dd = String(d.getDate())
  const mm = String(d.getMonth() + 1)
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export async function generarImportacionXlsx({ items, vigencia }: Params): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Hoja1')
  wb.addWorksheet('Hoja2')
  wb.addWorksheet('Hoja3')

  // ── Metadatos (filas 1-2) ────────────────────────────────────────────────────
  ws.getCell('A1').value = 'vigencia'
  ws.getCell('B1').value = formatDate(vigencia)
  ws.getCell('E1').value = 'cantidad compra'

  ws.getCell('A2').value = 'iva'
  ws.getCell('B2').value = 'SI'
  ws.getCell('E2').value = 'SI'
  ws.getCell('N2').value = 'SI = importa precio igual a planilla'
  ws.getCell('N3').value = 'NO= multiplica por cantidad de compra'

  // ── Cabeceras (fila 3) ────────────────────────────────────────────────────────
  ws.getCell('A3').value = 'codigo'
  ws.getCell('F3').value = 'precio compra'
  ws.getCell('G3').value = 'precio venta'
  ws.getCell('I3').value = 'tipo de IVA'

  // ── Datos (fila 4+) ordenados por cod_interno numérico ────────────────────────
  const sorted = [...items]
    .filter(i => i.cod_interno !== '' && i.cod_interno !== null && i.cod_interno !== undefined)
    .sort((a, b) => {
      const an = parseInt(codigoExportacion(a.cod_interno)) || 0
      const bn = parseInt(codigoExportacion(b.cod_interno)) || 0
      return an - bn
    })

  sorted.forEach((item, idx) => {
    const r = idx + 4

    // Código traducido para exportar: quita el sufijo interno anti-colisión
    // (p.ej. "214E" → "214"). El sistema externo espera el código original.
    const codExport = codigoExportacion(item.cod_interno)
    const cod = /^\d+$/.test(codExport) ? parseInt(codExport) : codExport

    // tipo de IVA: 1 = tasa básica (22%), 2 = tasa mínima (10% o menor)
    const tipoIva = item.iva_rate >= 0.20 ? 1 : 2

    // "precio venta" (col G): precio neto CON IVA incluido.
    // El sistema receptor espera el precio final con impuesto, no el neto.
    const precioVenta = Math.round(item.precio_neto * (1 + item.iva_rate) * 100) / 100

    ws.getCell(`A${r}`).value = cod
    // F (precio compra) va vacío
    ws.getCell(`G${r}`).value = precioVenta
    ws.getCell(`I${r}`).value = tipoIva
  })

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
