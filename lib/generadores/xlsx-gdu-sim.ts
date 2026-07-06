/**
 * Generador lista GDU desde simulación verificada
 * Replica EXACTAMENTE el formato del template "Tabla de costos para ingresar nuevos precios. GDU 2026"
 *
 * Estructura del template original:
 *   Row 1  → Cabecera (Referencia | Código GDU | Descripción | Precio de Lista Actual |
 *             Tipo de IVA | Costo Actual | Nvo.Precio Lista | Nuevo Costo | Variacion %)
 *   K2:K4  → "Fecha de rige anterior" (merged, con borde)
 *   K5     → Valor de la fecha de vigencia (rige)
 *   M2:M4  → "Fecha de ingreso al sistema" (merged, con borde)
 *   M5     → Fecha de hoy
 *
 * Lógica de precios:
 *   D = Precio de Lista Actual  = pvp_anterior / (1 + IVA)   → base del PVP anterior sin IVA
 *   F = Costo Actual            = D × (1 + IVA) = pvp_anterior  [fórmula]
 *   G = Nvo. Precio Lista       = pvp_sugerido / (1 + IVA)   → base del PVP nuevo sin IVA
 *   H = Nuevo Costo             = G × (1 + IVA) = pvp_sugerido  [fórmula]
 *   I = Variacion %             = (H/F) - 1 = pvp_nuevo / pvp_anterior - 1
 *
 *   Nota: se usa pvp_sugerido (no precio_neto) porque GDU necesita reflejar
 *   los cambios de PVP que se comunican desde la simulación verificada.
 */
import ExcelJS from 'exceljs'

interface Item {
  ean: string
  cod_interno: string | number
  cod_cadena: string | number
  descripcion: string
  familia: string
  sub_familia: string
  tipo_iva: string            // 'Mínima' | 'Básica' | 'Exento'
  iva_rate: number            // 0.22 | 0.10 | 0
  pvp_sugerido: number        // PVP nuevo → G = pvp_sugerido / (1+IVA)
  pvp_anterior: number | null // PVP anterior → D = pvp_anterior / (1+IVA)
  aumento_pct: number | null
}

interface Params {
  items: Item[]
  cadena: string
  vigencia: string
  nombre: string | null
}

// Colores del template original
const HDR_BG    = 'FF2E7D32'   // verde oscuro cabecera
const HDR_FG    = 'FFFFFFFF'   // blanco texto cabecera
const ROW_ALT   = 'FFE8F5E9'   // verde muy claro (cebrado)
const ROW_NORM  = 'FFFFFFFF'   // blanco
const BORDER    = 'FF9E9E9E'   // gris borde
const YELLOW    = 'FFFFFF00'   // amarillo columna G
const RED_FONT  = 'FFFF0000'   // rojo título G

// Orden canónico de familias
const FAMILIA_ORDER = [
  'Pastas Frescas ATM', 'Pastas Congeladas', 'Salsas',
  'Empanadas Congeladas', 'Masas', 'Pizzas Congeladas', 'Pastas Frescas',
]
const familiaRank = (f: string) => {
  const i = FAMILIA_ORDER.indexOf(f)
  return i === -1 ? 99 : i
}

export async function generarGduXlsx({ items, cadena, vigencia, nombre }: Params): Promise<Buffer> {
  void cadena; void nombre  // usados sólo para filename externo

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Avanti Uruguay'
  wb.created = new Date()

  const ws = wb.addWorksheet('tabla de costos')

  // ── Anchos de columna (igual al template original) ────────────────────────
  ws.columns = [
    { key: 'ref',       width: 19   },   // A - Referencia (cod_interno)
    { key: 'cod_gdu',   width: 21   },   // B - Código GDU
    { key: 'desc',      width: 74.5 },   // C - Descripción
    { key: 'p_actual',  width: 18   },   // D - Precio de Lista Actual
    { key: 'tipo_iva',  width: 18   },   // E - Tipo de IVA
    { key: 'c_actual',  width: 17   },   // F - Costo Actual (fórmula)
    { key: 'p_nuevo',   width: 18   },   // G - Nvo.Precio Lista  ← AMARILLO
    { key: 'c_nuevo',   width: 15   },   // H - Nuevo Costo (fórmula)
    { key: 'variacion', width: 15   },   // I - Variacion %
    { key: 'blank1',    width: 11.4 },   // J - espaciador
    { key: 'f_rige',    width: 23   },   // K - Fecha de rige anterior
    { key: 'blank2',    width: 3.4  },   // L - espaciador
    { key: 'f_ing',     width: 22.3 },   // M - Fecha de ingreso al sistema
  ]

  const fechaVig = vigencia
    ? new Date(vigencia + 'T00:00:00').toLocaleDateString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : ''

  const fechaHoy = new Date().toLocaleDateString('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: HDR_FG }, size: 10, name: 'Calibri' }
  const BODY_FONT:   Partial<ExcelJS.Font> = { size: 10, name: 'Calibri' }
  const MONEY = '"$"#,##0.00'
  const PCT   = '0.0%'

  const borderStyle: Partial<ExcelJS.Borders> = {
    top:    { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    left:   { style: 'thin', color: { argb: BORDER } },
    right:  { style: 'thin', color: { argb: BORDER } },
  }

  const boxBorder: Partial<ExcelJS.Borders> = {
    top:    { style: 'medium', color: { argb: 'FF000000' } },
    bottom: { style: 'medium', color: { argb: 'FF000000' } },
    left:   { style: 'medium', color: { argb: 'FF000000' } },
    right:  { style: 'medium', color: { argb: 'FF000000' } },
  }

  // ── Fila 1: Cabecera de columnas ─────────────────────────────────────────
  const hRow = ws.addRow([
    'Referencia', 'Código GDU', 'Descripción',
    'Precio de Lista Actual', 'Tipo de IVA', 'Costo Actual ',
    'Nvo.Precio Lista', 'Nuevo Costo', 'Variacion %',
    null, null, null, null,   // J, K, L, M — se configuran abajo
  ])
  hRow.height = 47
  hRow.eachCell((cell, col) => {
    if (col <= 9) {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: HDR_BG } }
      cell.font      = HEADER_FONT
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border    = borderStyle
    }
  })

  // G header override: fondo amarillo + texto rojo negrita
  const gHdr = hRow.getCell('p_nuevo')
  gHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } }
  gHdr.font  = { bold: true, color: { argb: RED_FONT }, size: 10, name: 'Calibri' }

  // ── Ordenar: familia canónica → descripción ───────────────────────────────
  const sorted = [...items].sort((a, b) => {
    const fr = familiaRank(a.familia) - familiaRank(b.familia)
    if (fr !== 0) return fr
    return a.descripcion.localeCompare(b.descripcion)
  })

  // ── Filas de datos ────────────────────────────────────────────────────────
  sorted.forEach((item, idx) => {
    const rowNum = idx + 2   // fila 1 = header, datos desde fila 2

    // Precio Facturación Neta = PVP / (1 + IVA)  → la fórmula F/H lo multiplica de vuelta
    const divisor = 1 + (item.iva_rate ?? 0.22)
    const precioListaActual = item.pvp_anterior != null
      ? Math.round(item.pvp_anterior / divisor * 100) / 100
      : null
    const precioListaNuevo = Math.round(item.pvp_sugerido / divisor * 100) / 100

    const r = ws.addRow([
      item.cod_interno ? String(item.cod_interno) : '',   // A
      item.cod_cadena  ? String(item.cod_cadena)  : '',   // B
      item.descripcion,                                    // C
      precioListaActual,                                   // D
      item.tipo_iva,                                       // E
      null,                                                // F - fórmula
      precioListaNuevo,                                    // G - AMARILLO
      null,                                                // H - fórmula
      null,                                                // I - fórmula
    ])
    r.font   = BODY_FONT
    r.height = 19.5

    // Fórmulas
    r.getCell('c_actual').value = {
      formula: `IF(D${rowNum}="","",IF(E${rowNum}="Básica",D${rowNum}*1.22,IF(E${rowNum}="Mínima",D${rowNum}*1.1,D${rowNum}*1)))`,
    }
    r.getCell('c_nuevo').value = {
      formula: `IF(E${rowNum}="Básica",G${rowNum}*1.22,IF(E${rowNum}="Mínima",G${rowNum}*1.1,G${rowNum}*1))`,
    }
    r.getCell('variacion').value = {
      formula: `IF(F${rowNum}="","",IF(F${rowNum}>0,(H${rowNum}/F${rowNum})-1,""))`,
    }

    // Formatos numéricos
    r.getCell('ref').numFmt       = '@'
    r.getCell('cod_gdu').numFmt   = '@'
    r.getCell('p_actual').numFmt  = MONEY
    r.getCell('c_actual').numFmt  = MONEY
    r.getCell('p_nuevo').numFmt   = MONEY
    r.getCell('c_nuevo').numFmt   = MONEY
    r.getCell('variacion').numFmt = PCT

    // Alineaciones
    r.getCell('ref').alignment       = { horizontal: 'left',   vertical: 'middle' }
    r.getCell('cod_gdu').alignment   = { horizontal: 'left',   vertical: 'middle' }
    r.getCell('desc').alignment      = { horizontal: 'left',   vertical: 'middle' }
    r.getCell('tipo_iva').alignment  = { horizontal: 'center', vertical: 'middle' }
    r.getCell('variacion').alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell('p_actual').alignment  = { horizontal: 'right',  vertical: 'middle' }
    r.getCell('c_actual').alignment  = { horizontal: 'right',  vertical: 'middle' }
    r.getCell('p_nuevo').alignment   = { horizontal: 'right',  vertical: 'middle' }
    r.getCell('c_nuevo').alignment   = { horizontal: 'right',  vertical: 'middle' }

    // Cebrado verde en A-F, H-I; G siempre amarillo
    const bgArgb = idx % 2 === 0 ? ROW_ALT : ROW_NORM
    for (let col = 1; col <= 9; col++) {
      const isG = col === 7
      r.getCell(col).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: isG ? YELLOW : bgArgb },
      }
      r.getCell(col).border = {
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right:  { style: 'thin', color: { argb: 'FFDDDDDD' } },
      }
    }
  })

  // ── Sección K: "Fecha de rige anterior" (K2:K4 merged) + valor en K5 ─────
  ws.mergeCells('K2:K4')
  const kTitle = ws.getCell('K2')
  kTitle.value     = 'Fecha de rige\nanterior'
  kTitle.font      = { bold: true, size: 10, name: 'Calibri' }
  kTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  kTitle.border    = boxBorder

  const kDate = ws.getCell('K5')
  kDate.value     = fechaVig
  kDate.font      = { size: 10, name: 'Calibri' }
  kDate.alignment = { horizontal: 'center', vertical: 'middle' }
  kDate.border    = boxBorder

  // ── Sección M: "Fecha de ingreso al sistema" (M2:M4 merged) + valor en M5 ─
  ws.mergeCells('M2:M4')
  const mTitle = ws.getCell('M2')
  mTitle.value     = 'Fecha de ingreso\nal sistema'
  mTitle.font      = { bold: true, size: 10, name: 'Calibri' }
  mTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  mTitle.border    = boxBorder

  const mDate = ws.getCell('M5')
  mDate.value     = fechaHoy
  mDate.font      = { size: 10, name: 'Calibri' }
  mDate.alignment = { horizontal: 'center', vertical: 'middle' }
  mDate.border    = boxBorder

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
