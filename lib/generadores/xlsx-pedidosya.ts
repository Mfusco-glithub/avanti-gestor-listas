/**
 * Generador lista PEDIDOS YA
 * Formato: notificacion "Cambio de precios" con Costo Actual vs Nuevo Costo
 * Hoja unica con todos los productos ordenados por familia/subfamilia
 */
import ExcelJS from 'exceljs'

interface Item {
  ean: string
  cod_interno: string | number
  cod_cadena: string
  descripcion: string
  familia: string
  sub_familia: string
  marca: string
  unidades_caja: string | number
  iva_rate: number
  precio_neto: number
  precio_c_iva: number
  pvp_sugerido: number
  precio_neto_anterior: number | null
  precio_c_iva_anterior: number | null
  pvp_anterior: number | null
  aumento_pct: number | null
}

interface Params {
  items: Item[]
  cadena: string
  vigencia: string
  nombre: string | null
}

// Colores
const PY_RED  = 'FFCC0000'
const PY_DARK = 'FF1A1A2E'
const WHITE   = 'FFFFFFFF'
const LGRAY   = 'FFF5F5F5'
const YELLOW  = 'FFFFF9C4'

const SF_ORDER = [
  'Copetin', 'Empanadas x 12', 'Empanadas x 20', 'Empanadas x 40', 'Empanadas XL', 'Empanadas x 6',
  'Tapas Redondas', 'Tapas Rectangulares', 'Masa Tarta',
  'Ravioles', 'Raviolones', 'Sorrentinos', 'Tallarines', 'Tagliatelle',
  'Pack Ravioles',
  'Ravioles Congelados', 'Sorrentinos Congelados',
  'Empanadas x 3', 'Pizzas Congeladas',
  'Salsas 200 g', 'Salsas 480 g',
]
function sfRank(sf: string) {
  const i = SF_ORDER.indexOf(sf)
  return i === -1 ? 99 : i
}

function bold(cell: ExcelJS.Cell, bg: string, fg = WHITE, size = 9) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.font      = { bold: true, color: { argb: fg }, size, name: 'Arial' }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function num(cell: ExcelJS.Cell, value: number | null, fmt = '"$"#,##0.00', bg = WHITE) {
  cell.value     = value ?? null
  if (value !== null && value !== undefined) cell.numFmt = fmt
  cell.font      = { size: 9, name: 'Arial' }
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
}

function txt(cell: ExcelJS.Cell, value: string | number | null, bg = WHITE, align: ExcelJS.Alignment['horizontal'] = 'left') {
  cell.value     = value ?? ''
  cell.font      = { size: 9, name: 'Arial' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.alignment = { horizontal: align, vertical: 'middle' }
  cell.numFmt    = '@'
}

export async function generarPedidosYaXlsx({ items, vigencia, nombre }: Params): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Avanti Uruguay'
  wb.created = new Date()

  const fechaVig = vigencia
    ? new Date(vigencia + 'T00:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  const ws = wb.addWorksheet('PedidosYa')

  // A spacer | B EAN | C COD | D DESCRIPCION | E IVA% | F Actual s/IVA | G Actual c/IVA | H Nuevo s/IVA | I Nuevo c/IVA | J VAR%
  ws.columns = [
    { width: 2  },  // A spacer
    { width: 18 },  // B: EAN
    { width: 10 },  // C: COD INTERNO
    { width: 44 },  // D: DESCRIPCION
    { width: 8  },  // E: %IVA
    { width: 16 },  // F: Costo Actual s/IVA
    { width: 16 },  // G: Costo Actual c/IVA
    { width: 16 },  // H: Nuevo Costo s/IVA
    { width: 16 },  // I: Nuevo Costo c/IVA
    { width: 11 },  // J: Variacion%
  ]

  // Fila 1: banner
  ws.getRow(1).height = 48
  ws.mergeCells('B1:J1')
  const banner = ws.getCell('B1')
  const listaNombre = nombre ? '  —  ' + nombre : ''
  banner.value     = 'CAMBIO DE PRECIOS - PEDIDOS YA' + listaNombre + '  |  Vigencia: ' + fechaVig
  banner.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: PY_DARK } }
  banner.font      = { bold: true, size: 14, name: 'Arial', color: { argb: WHITE } }
  banner.alignment = { horizontal: 'center', vertical: 'middle' }

  // Fila 2: proveedor + secciones
  ws.getRow(2).height = 18
  ws.mergeCells('B2:D2')
  const prov = ws.getCell('B2')
  prov.value     = 'Proveedor: LABREZZA S.A.'
  prov.font      = { bold: true, size: 9, name: 'Arial' }
  prov.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } }
  prov.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

  ws.mergeCells('F2:G2')
  const actHdr = ws.getCell('F2')
  actHdr.value = 'COSTOS ACTUALES'
  bold(actHdr, '424242')

  ws.mergeCells('H2:I2')
  const nvoHdr = ws.getCell('H2')
  nvoHdr.value = 'NUEVOS COSTOS'
  bold(nvoHdr, PY_RED)

  // Fila 3: cabeceras
  ws.getRow(3).height = 30
  const hdrs: { col: string; lbl: string; bg: string }[] = [
    { col: 'B', lbl: 'EAN / Cod. Barras', bg: PY_DARK },
    { col: 'C', lbl: 'Cod.\nInterno',      bg: PY_DARK },
    { col: 'D', lbl: 'Descripcion',        bg: PY_DARK },
    { col: 'E', lbl: '%IVA',              bg: PY_DARK },
    { col: 'F', lbl: 'Costo Actual\ns/IVA', bg: '424242' },
    { col: 'G', lbl: 'Costo Actual\nc/IVA', bg: '424242' },
    { col: 'H', lbl: 'Nuevo Costo\ns/IVA',  bg: PY_RED  },
    { col: 'I', lbl: 'Nuevo Costo\nc/IVA',  bg: PY_RED  },
    { col: 'J', lbl: 'Variacion\n%',        bg: PY_DARK },
  ]
  for (const h of hdrs) {
    const cell = ws.getCell(h.col + '3')
    bold(cell, h.bg)
    cell.value = h.lbl
  }

  // Datos
  const sorted = [...items].sort((a, b) => {
    const fam = a.familia.localeCompare(b.familia)
    if (fam !== 0) return fam
    const sf = sfRank(a.sub_familia) - sfRank(b.sub_familia)
    if (sf !== 0) return sf
    return a.descripcion.localeCompare(b.descripcion)
  })

  let currentRow = 4
  let lastFamilia = ''

  for (const item of sorted) {
    // Sub-cabecera de familia
    if (item.familia !== lastFamilia) {
      ws.getRow(currentRow).height = 15
      ws.mergeCells('B' + currentRow + ':J' + currentRow)
      const gh = ws.getCell('B' + currentRow)
      gh.value     = item.familia.toUpperCase()
      gh.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: '37474F' } }
      gh.font      = { bold: true, size: 8, name: 'Arial', color: { argb: WHITE } }
      gh.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
      currentRow++
      lastFamilia = item.familia
    }

    const r   = ws.getRow(currentRow)
    r.height  = 18
    const bg  = currentRow % 2 === 0 ? LGRAY : WHITE

    ws.getCell('A' + currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }

    txt(ws.getCell('B' + currentRow), String(item.ean), bg)
    ws.getCell('B' + currentRow).numFmt = '@'
    txt(ws.getCell('C' + currentRow), item.cod_interno ? String(item.cod_interno) : '', bg, 'center')
    txt(ws.getCell('D' + currentRow), item.descripcion, bg)

    const ivaPct = Math.round(item.iva_rate * 100)
    txt(ws.getCell('E' + currentRow), ivaPct + '%', bg, 'center')

    num(ws.getCell('F' + currentRow), item.precio_neto_anterior, '"$"#,##0.00', bg)
    num(ws.getCell('G' + currentRow), item.precio_c_iva_anterior, '"$"#,##0.00', bg)
    num(ws.getCell('H' + currentRow), item.precio_neto, '"$"#,##0.00', YELLOW)
    num(ws.getCell('I' + currentRow), item.precio_c_iva, '"$"#,##0.00', YELLOW)

    if (item.aumento_pct !== null) {
      const vc = ws.getCell('J' + currentRow)
      vc.value     = item.aumento_pct
      vc.numFmt    = '0.0%'
      vc.font      = { bold: true, size: 9, name: 'Arial', color: { argb: item.aumento_pct > 0 ? '1B5E20' : 'C62828' } }
      vc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      vc.alignment = { horizontal: 'center', vertical: 'middle' }
    } else {
      txt(ws.getCell('J' + currentRow), '—', bg, 'center')
    }

    currentRow++
  }

  // Nota al pie
  currentRow += 2
  ws.mergeCells('B' + currentRow + ':J' + currentRow)
  const note = ws.getCell('B' + currentRow)
  note.value     = 'Generado el ' + new Date().toLocaleDateString('es-UY') + '  -  Vigencia desde ' + fechaVig
  note.font      = { italic: true, size: 8, name: 'Arial', color: { argb: '757575' } }
  note.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(currentRow).height = 14

  ws.views = [{ state: 'frozen', ySplit: 3 }]

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
