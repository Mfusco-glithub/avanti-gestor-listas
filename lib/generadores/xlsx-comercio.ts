/**
 * Generador lista COMERCIO desde simulación verificada
 * Hojas: AVANTI MASAS | AVANTI PASTAS Y SALSAS | PASTAMANIA
 * Columnas principales: F = precio s/IVA, G = precio c/IVA, H = PVP sugerido
 * Columnas anteriores: J = ant s/IVA, K = ant c/IVA, L = aumento%
 */
import ExcelJS from 'exceljs'

interface Item {
  ean: string
  cod_interno: string | number
  descripcion: string
  familia: string
  sub_familia: string
  marca: string
  unidades_caja: string | number
  unidades_caja_tienda: number | null
  iva_rate: number
  precio_neto: number
  precio_c_iva: number
  pvp_sugerido: number
  precio_neto_anterior: number | null
  precio_c_iva_anterior: number | null
  pvp_anterior: number | null
}

interface Params {
  items: Item[]
  cadena: string
  vigencia: string
  nombre: string | null
}

// ── Colores ──────────────────────────────────────────────────────────────────
const RED   = 'FFCC0000'
const WHITE = 'FFFFFFFF'
const LRED  = 'FFFFEBEE'
const BLUE  = 'FF0D47A1'
const LBLUE = 'FFE3F2FD'
const GRAY  = 'FF616161'
const LGRAY = 'FFF5F5F5'
const GREEN = 'FF2E7D32'

// ── Helpers ──────────────────────────────────────────────────────────────────
function isPastamania(marca: string) {
  return marca === 'PASTAMANIA' || marca === 'PASTAMANÍA'
}

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

function getMasasGroup(item: Item): string {
  if (item.descripcion.toLowerCase().includes('light')) return 'Masas Light'
  const sf = item.sub_familia
  if (['Copetin', 'Empanadas x 12', 'Empanadas x 20', 'Empanadas x 40', 'Empanadas XL', 'Empanadas x 6'].includes(sf))
    return 'Masas para Empanadas'
  if (['Tapas Rectangulares', 'Tapas Redondas'].includes(sf)) return 'Masas para Tapas'
  if (sf === 'Masa Tarta') return 'Masas para Tartas'
  return 'Masas para Empanadas'
}

// ── Definición de hojas ───────────────────────────────────────────────────────
interface SheetDef {
  name: string
  filter: (i: Item) => boolean
  getGroup: (i: Item) => string
  groupOrder: string[]
  accent: string
  pvpFill: string
}

const SHEET_DEFS: SheetDef[] = [
  {
    name: 'AVANTI MASAS',
    filter: (i) => i.familia === 'Masas' && i.marca === 'AVANTI',
    getGroup: getMasasGroup,
    groupOrder: ['Masas para Empanadas', 'Masas para Tapas', 'Masas para Tartas', 'Masas Light'],
    accent: RED,
    pvpFill: LRED,
  },
  {
    name: 'AVANTI PASTAS Y SALSAS',
    filter: (i) => i.marca === 'AVANTI' && i.familia !== 'Masas',
    getGroup: (i) => {
      if (i.familia === 'Pastas Frescas ATM') return 'Pasta Fresca Envasada'
      if (i.familia === 'Salsas') return 'Salsas'
      if (i.familia === 'Empanadas Congeladas') return 'Empanadas Congeladas'
      if (i.familia === 'Pastas Congeladas') return 'Pastas Congeladas'
      if (i.familia === 'Pizzas Congeladas') return 'Pizzas Congeladas'
      return i.familia
    },
    groupOrder: ['Pasta Fresca Envasada', 'Salsas', 'Empanadas Congeladas', 'Pastas Congeladas', 'Pizzas Congeladas'],
    accent: RED,
    pvpFill: LRED,
  },
  {
    name: 'PASTAMANIA',
    filter: (i) => isPastamania(i.marca),
    getGroup: (i) => {
      if (i.familia === 'Masas') return getMasasGroup(i)
      if (i.sub_familia === 'Pack Ravioles' || i.familia === 'Pastas Frescas ATM') return 'Pasta Fresca Envasada'
      return i.familia
    },
    groupOrder: ['Masas para Empanadas', 'Masas para Tapas', 'Pasta Fresca Envasada'],
    accent: BLUE,
    pvpFill: LBLUE,
  },
]

// ── Helpers de estilo ────────────────────────────────────────────────────────
function bold(cell: ExcelJS.Cell, bg: string, fg = WHITE) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.font      = { bold: true, color: { argb: fg }, size: 8, name: 'Arial' }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function num(cell: ExcelJS.Cell, value: number | null, fmt = '"$"#,##0.00', bg = WHITE) {
  cell.value     = value ?? null
  if (value !== null && value !== undefined) cell.numFmt = fmt
  cell.font      = { size: 8, name: 'Arial' }
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
}

function txt(cell: ExcelJS.Cell, value: string | number | null, bg = WHITE, align: ExcelJS.Alignment['horizontal'] = 'left') {
  cell.value     = value ?? ''
  cell.font      = { size: 8, name: 'Arial' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.alignment = { horizontal: align, vertical: 'middle' }
  cell.numFmt    = '@'
}

// ── Construcción de cada hoja ─────────────────────────────────────────────────
function buildSheet(
  wb: ExcelJS.Workbook,
  def: SheetDef,
  sheetItems: Item[],
  fechaVig: string,
  nombre: string | null,
  canalLabel: string,
): void {
  if (sheetItems.length === 0) return

  const ws = wb.addWorksheet(def.name)

  // A: spacer | B: EAN | C: COD | D: DESCRIPCION | E: UNIDADES
  // F: PRECIO S/IVA | G: PRECIO C/IVA | H: PVP SUGERIDO
  // I: spacer | J: ANT S/IVA | K: ANT C/IVA | L: AUMENTO
  ws.columns = [
    { width: 2  },  // A
    { width: 18 },  // B: EAN
    { width: 10 },  // C: COD INTERNO
    { width: 44 },  // D: DESCRIPCION
    { width: 12 },  // E: UNIDADES
    { width: 14 },  // F: PRECIO S/IVA
    { width: 14 },  // G: PRECIO C/IVA
    { width: 14 },  // H: PVP SUGERIDO
    { width: 2  },  // I: spacer
    { width: 14 },  // J: ANT S/IVA
    { width: 14 },  // K: ANT C/IVA
    { width: 10 },  // L: AUMENTO
  ]

  // ── Fila 1: banner ────────────────────────────────────────────────────────
  ws.getRow(1).height = 48
  ws.mergeCells('B1:H1')
  const bannerCell = ws.getCell('B1')
  const listaNombre = nombre ? `  —  ${nombre}` : ''
  bannerCell.value     = `${canalLabel}${listaNombre}  |  Vigencia: ${fechaVig}`
  bannerCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
  bannerCell.font      = { bold: true, size: 13, name: 'Arial', color: { argb: WHITE } }
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells('J1:L1')
  const antBanner = ws.getCell('J1')
  antBanner.value     = 'PRECIOS ANTERIORES'
  antBanner.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
  antBanner.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
  antBanner.alignment = { horizontal: 'center', vertical: 'middle' }

  let currentRow = 2

  // ── Agrupar y ordenar ─────────────────────────────────────────────────────
  const porGrupo: Record<string, Item[]> = {}
  for (const item of sheetItems) {
    const g = def.getGroup(item)
    if (!porGrupo[g]) porGrupo[g] = []
    porGrupo[g].push(item)
  }

  const defined = def.groupOrder.filter(g => porGrupo[g])
  const rest    = Object.keys(porGrupo).filter(g => !def.groupOrder.includes(g)).sort()
  const grupos  = [...defined, ...rest]

  for (const grupo of grupos) {
    const groupItems = porGrupo[grupo]
    if (!groupItems?.length) continue

    // ── Sub-cabecera de grupo ─────────────────────────────────────────────
    ws.getRow(currentRow).height = 16
    ws.mergeCells(`B${currentRow}:H${currentRow}`)
    const ghCell = ws.getCell(`B${currentRow}`)
    ghCell.value     = grupo.toUpperCase()
    ghCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
    ghCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    ghCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

    ws.mergeCells(`J${currentRow}:L${currentRow}`)
    const antCell = ws.getCell(`J${currentRow}`)
    antCell.value     = 'LISTA DE PRECIOS ANT'
    antCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
    antCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    antCell.alignment = { horizontal: 'center', vertical: 'middle' }

    currentRow++

    // ── Fila de cabeceras ─────────────────────────────────────────────────
    ws.getRow(currentRow).height = 30
    const hdr = [
      { col: 'B', lbl: 'COD. BARRAS',         bg: def.accent },
      { col: 'C', lbl: 'COD.\nINTERNO',        bg: def.accent },
      { col: 'D', lbl: 'DESCRIPCION',          bg: def.accent },
      { col: 'E', lbl: 'UNIDADES\nPAQ / CAJA', bg: def.accent },
      { col: 'F', lbl: 'PRECIO\nS/IVA',        bg: def.accent },
      { col: 'G', lbl: 'PRECIO\nC/IVA',        bg: def.accent },
      { col: 'H', lbl: 'PVP\nSUGERIDO',        bg: def.accent },
      { col: 'J', lbl: 'COSTO\nS/IVA ANT',     bg: GRAY },
      { col: 'K', lbl: 'COSTO\nC/IVA ANT',     bg: GRAY },
      { col: 'L', lbl: 'AUMENTO',              bg: GRAY },
    ]
    for (const h of hdr) {
      const cell = ws.getCell(`${h.col}${currentRow}`)
      bold(cell, h.bg)
      cell.value = h.lbl
    }
    currentRow++

    // ── Filas de datos ────────────────────────────────────────────────────
    groupItems
      .sort((a, b) => {
        const sfDiff = sfRank(a.sub_familia) - sfRank(b.sub_familia)
        if (sfDiff !== 0) return sfDiff
        return a.descripcion.localeCompare(b.descripcion)
      })
      .forEach((item, idx) => {
        const r    = ws.getRow(currentRow)
        r.height   = 18
        const bg   = idx % 2 === 0 ? LGRAY : WHITE

        const precioNeto    = item.precio_neto
        const precioCIva    = item.precio_c_iva
        const prevNeto      = item.precio_neto_anterior
        const prevCIva      = item.precio_c_iva_anterior
        const aumento       = prevNeto && precioNeto ? (precioNeto - prevNeto) / prevNeto : null

        const unidades = item.unidades_caja_tienda
          ?? (typeof item.unidades_caja === 'number' ? item.unidades_caja : Number(item.unidades_caja) || null)

        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }

        txt(ws.getCell(`B${currentRow}`), item.ean ? String(item.ean) : '', bg, 'left')
        ws.getCell(`B${currentRow}`).numFmt = '@'
        txt(ws.getCell(`C${currentRow}`), item.cod_interno ? String(item.cod_interno) : '', bg, 'center')
        txt(ws.getCell(`D${currentRow}`), item.descripcion, bg)
        txt(ws.getCell(`E${currentRow}`), unidades ? `${unidades} PAQ` : '', bg, 'center')

        // F: precio s/IVA
        num(ws.getCell(`F${currentRow}`), precioNeto, '"$"#,##0.00', bg)

        // G: precio c/IVA
        num(ws.getCell(`G${currentRow}`), precioCIva, '"$"#,##0.00', bg)

        // H: PVP sugerido (destacado)
        num(ws.getCell(`H${currentRow}`), item.pvp_sugerido, '"$"#,##0.00', def.pvpFill)
        ws.getCell(`H${currentRow}`).font = { bold: true, size: 8, name: 'Arial' }

        // I: spacer
        ws.getCell(`I${currentRow}`).value = null

        // J: Costo s/IVA anterior
        num(ws.getCell(`J${currentRow}`), prevNeto, '"$"#,##0.00', bg)

        // K: Costo c/IVA anterior
        num(ws.getCell(`K${currentRow}`), prevCIva, '"$"#,##0.00', bg)

        // L: % Aumento
        if (aumento !== null) {
          ws.getCell(`L${currentRow}`).value     = aumento
          ws.getCell(`L${currentRow}`).numFmt    = '0.0%'
          ws.getCell(`L${currentRow}`).font      = { size: 8, name: 'Arial', color: { argb: aumento > 0 ? GREEN : 'FFC62828' } }
          ws.getCell(`L${currentRow}`).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          ws.getCell(`L${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        }

        currentRow++
      })

    currentRow++ // separador entre grupos
  }

  // Freeze first row (banner)
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

// ── Función principal exportada ───────────────────────────────────────────────
export async function generarComercioXlsx({ items, vigencia, nombre }: Params): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Avanti Uruguay'
  wb.created = new Date()

  const fechaVig = vigencia
    ? new Date(vigencia + 'T00:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  const canalLabel = 'LISTA DE PRECIOS COMERCIO'

  for (const def of SHEET_DEFS) {
    const sheetItems = items.filter(i => def.filter(i))
    buildSheet(wb, def, sheetItems, fechaVig, nombre, canalLabel)
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
