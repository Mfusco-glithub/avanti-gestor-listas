/**
 * Generador lista MACRO desde simulación verificada
 * Hojas: AVANTI MASAS | AVANTI PASTAS Y SALSAS | PASTAMANIA | CEFA
 * Columna F = precio_neto (costo fábrica s/IMP), G = PVP sugerido
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
const CRED  = 'FF8B1A1A'   // rojo oscuro para CEFA
const WHITE = 'FFFFFFFF'
const LRED  = 'FFFFEBEE'
const BLUE  = 'FF0D47A1'
const LBLUE = 'FFE3F2FD'
const GRAY  = 'FF616161'
const LGRAY = 'FFF5F5F5'

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

function getCEFAGroup(item: Item): string {
  const sf = item.sub_familia
  if (['Copetin', 'Empanadas x 12', 'Empanadas x 20', 'Empanadas x 40', 'Empanadas XL', 'Empanadas x 6'].includes(sf))
    return 'Empanadas'
  if (sf === 'Tapas Redondas') return 'Tapas Redondas'
  if (sf === 'Tapas Rectangulares') return 'Tapas Rectangulares'
  return 'Otros'
}

// ── Definición de hojas ───────────────────────────────────────────────────────
interface SheetDef {
  name: string
  filter: (i: Item) => boolean
  getGroup: (i: Item) => string
  groupOrder: string[]
  accent: string
  pvpFill: string
  footer: string | null
}

const SHEET_DEFS: SheetDef[] = [
  {
    name: 'AVANTI MASAS',
    filter: (i) => i.familia === 'Masas' && i.marca === 'AVANTI',
    getGroup: getMasasGroup,
    groupOrder: ['Masas para Empanadas', 'Masas para Tapas', 'Masas para Tartas', 'Masas Light'],
    accent: RED,
    pvpFill: LRED,
    footer: null,
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
    footer: null,
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
    footer: null,
  },
  {
    name: 'CEFA',
    filter: (i) => i.marca === 'CEFA',
    getGroup: getCEFAGroup,
    groupOrder: ['Empanadas', 'Tapas Redondas', 'Tapas Rectangulares'],
    accent: CRED,
    pvpFill: LRED,
    footer: '* DESCUENTO POR ACUERDO COMERCIAL 12% Y 7% CEFA INCLUIDO EN PRECIO DE FACTURACIÓN',
  },
]

// ── Helpers de estilo ────────────────────────────────────────────────────────
function bold(cell: ExcelJS.Cell, bg: string, fg = WHITE) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.font      = { bold: true, color: { argb: fg }, size: 8, name: 'Arial' }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function num(cell: ExcelJS.Cell, value: number | null, fmt = '"$"#,##0.00', bg = 'FFFFFFFF') {
  cell.value     = value ?? null
  if (value !== null && value !== undefined) cell.numFmt = fmt
  cell.font      = { size: 8, name: 'Arial' }
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
}

function txt(cell: ExcelJS.Cell, value: string | number | null, bg = 'FFFFFFFF', align: ExcelJS.Alignment['horizontal'] = 'left') {
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
): void {
  if (sheetItems.length === 0) return

  const ws = wb.addWorksheet(def.name)

  // Columnas A-P (16)
  // A: spacer | B: EAN | C: COD INTERNO | D: DESCRIPCION | E: UNIDADES | F: PRECIO SIN IMP | G: PVP
  // H: spacer | I: MARGEN | J: COSTO BASE S/IMP | K: COSTO BASE C/IMP | L: TOTAL CAJA
  // M: spacer | N: ANT S/IMP | O: ANT C/IMP | P: AUMENTO
  ws.columns = [
    { width: 2  },  // A
    { width: 18 },  // B: EAN
    { width: 10 },  // C: COD INTERNO
    { width: 44 },  // D: DESCRIPCION
    { width: 13 },  // E: UNIDADES PAQ/CAJA
    { width: 14 },  // F: PRECIO SIN IMP
    { width: 14 },  // G: PVP SUGERIDO
    { width: 2  },  // H: spacer
    { width: 10 },  // I: MARGEN
    { width: 14 },  // J: COSTO BASE S/IMP
    { width: 16 },  // K: COSTO BASE C/IMP
    { width: 16 },  // L: TOTAL CAJA S/IMP
    { width: 2  },  // M: spacer
    { width: 14 },  // N: ANT S/IMP
    { width: 16 },  // O: ANT C/IMP
    { width: 10 },  // P: AUMENTO
  ]

  // ── Fila 1: banner ────────────────────────────────────────────────────────
  ws.getRow(1).height = 48
  ws.mergeCells('B1:L1')
  const bannerCell = ws.getCell('B1')
  const listaNombre = nombre ? `  —  ${nombre}` : ''
  bannerCell.value     = `LISTA DE PRECIOS MACRO${listaNombre}  |  Vigencia: ${fechaVig}`
  bannerCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
  bannerCell.font      = { bold: true, size: 13, name: 'Arial', color: { argb: WHITE } }
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells('N1:P1')
  const antBanner = ws.getCell('N1')
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
    ws.mergeCells(`B${currentRow}:G${currentRow}`)
    const ghCell = ws.getCell(`B${currentRow}`)
    ghCell.value     = grupo.toUpperCase()
    ghCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
    ghCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    ghCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

    ws.mergeCells(`I${currentRow}:L${currentRow}`)
    const lpCell = ws.getCell(`I${currentRow}`)
    lpCell.value     = 'LISTA DE PRECIOS'
    lpCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
    lpCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    lpCell.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.mergeCells(`N${currentRow}:P${currentRow}`)
    const antCell = ws.getCell(`N${currentRow}`)
    antCell.value     = 'LISTA DE PRECIOS ANT'
    antCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
    antCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    antCell.alignment = { horizontal: 'center', vertical: 'middle' }

    currentRow++

    // ── Fila de cabeceras de columna ───────────────────────────────────────
    ws.getRow(currentRow).height = 30
    const hdr = [
      { col: 'B', lbl: 'COD. BARRAS',          bg: def.accent },
      { col: 'C', lbl: 'COD.\nINTERNO',         bg: def.accent },
      { col: 'D', lbl: 'DESCRIPCION',           bg: def.accent },
      { col: 'E', lbl: 'UNIDADES\nPAQ / CAJA',  bg: def.accent },
      { col: 'F', lbl: 'PRECIO\nSIN IMP',       bg: def.accent },
      { col: 'G', lbl: 'PVP\nSUGERIDO',         bg: def.accent },
      { col: 'I', lbl: 'MARGEN',                bg: def.accent },
      { col: 'J', lbl: 'COSTO BASE\nS/IMP',     bg: def.accent },
      { col: 'K', lbl: 'COSTO BASE\nC/IMP',     bg: def.accent },
      { col: 'L', lbl: 'TOTAL CAJA\nS/IMP',     bg: def.accent },
      { col: 'N', lbl: 'COSTO BASE\nS/IMP',     bg: GRAY },
      { col: 'O', lbl: 'COSTO BASE\nC/IMP',     bg: GRAY },
      { col: 'P', lbl: 'AUMENTO',               bg: GRAY },
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
        const bg   = idx % 2 === 0 ? LGRAY : 'FFFFFFFF'

        const precioNeto     = item.precio_neto
        const precioNetoCIva = item.precio_c_iva        // precio_neto × (1 + iva_rate)
        const mb             = item.pvp_sugerido > 0
          ? 1 - precioNetoCIva / item.pvp_sugerido
          : null
        const unidades = item.unidades_caja_tienda
          ?? (typeof item.unidades_caja === 'number' ? item.unidades_caja : Number(item.unidades_caja) || null)
        const totalCaja  = unidades && precioNeto ? Math.round(precioNeto * unidades * 100) / 100 : null
        const prevNeto   = item.precio_neto_anterior
        const prevCIva   = item.precio_c_iva_anterior
        const aumento    = prevNeto && precioNeto ? (precioNeto - prevNeto) / prevNeto : null

        // Spacer A
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }

        // Sección izquierda
        txt(ws.getCell(`B${currentRow}`), String(item.ean), bg, 'left')
        ws.getCell(`B${currentRow}`).numFmt = '@'
        txt(ws.getCell(`C${currentRow}`), item.cod_interno ? String(item.cod_interno) : '', bg, 'center')
        txt(ws.getCell(`D${currentRow}`), item.descripcion, bg)
        txt(ws.getCell(`E${currentRow}`), unidades ? `${unidades} PAQ` : '', bg, 'center')

        // F: precio_neto (costo fábrica sin IVA)
        num(ws.getCell(`F${currentRow}`), precioNeto, '"$"#,##0.00', bg)

        // G: PVP sugerido (destacado)
        num(ws.getCell(`G${currentRow}`), item.pvp_sugerido, '"$"#,##0.00', def.pvpFill)
        ws.getCell(`G${currentRow}`).font = { bold: true, size: 8, name: 'Arial' }

        // H: spacer
        ws.getCell(`H${currentRow}`).value = null

        // Sección LISTA DE PRECIOS
        if (mb !== null) {
          ws.getCell(`I${currentRow}`).value     = mb
          ws.getCell(`I${currentRow}`).numFmt    = '0.0%'
          ws.getCell(`I${currentRow}`).font      = { bold: true, size: 8, name: 'Arial', color: { argb: mb >= 0.30 ? 'FF1B5E20' : 'FF7B1FA2' } }
          ws.getCell(`I${currentRow}`).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          ws.getCell(`I${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        }

        num(ws.getCell(`J${currentRow}`), precioNeto, '"$"#,##0.00', bg)
        num(ws.getCell(`K${currentRow}`), precioNetoCIva, '"$"#,##0.00', bg)
        num(ws.getCell(`L${currentRow}`), totalCaja, '"$"#,##0.00', bg)

        // M: spacer
        ws.getCell(`M${currentRow}`).value = null

        // Sección ANT
        num(ws.getCell(`N${currentRow}`), prevNeto, '"$"#,##0.00', bg)
        num(ws.getCell(`O${currentRow}`), prevCIva, '"$"#,##0.00', bg)

        if (aumento !== null) {
          ws.getCell(`P${currentRow}`).value     = aumento
          ws.getCell(`P${currentRow}`).numFmt    = '0.0%'
          ws.getCell(`P${currentRow}`).font      = { size: 8, name: 'Arial', color: { argb: aumento > 0 ? 'FF1B5E20' : 'FFC62828' } }
          ws.getCell(`P${currentRow}`).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          ws.getCell(`P${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        }

        currentRow++
      })

    currentRow++ // separador entre grupos
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  if (def.footer) {
    currentRow++
    ws.mergeCells(`B${currentRow}:L${currentRow}`)
    const fc = ws.getCell(`B${currentRow}`)
    fc.value     = def.footer
    fc.font      = { italic: true, size: 8, name: 'Arial', color: { argb: CRED } }
    fc.alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getRow(currentRow).height = 16
  }
}

// ── Función principal exportada ───────────────────────────────────────────────
export async function generarMacroXlsx({ items, cadena, vigencia, nombre }: Params): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Avanti Uruguay'
  wb.created = new Date()

  const fechaVig = vigencia
    ? new Date(vigencia + 'T00:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  for (const def of SHEET_DEFS) {
    const sheetItems = items.filter(i => def.filter(i))
    buildSheet(wb, def, sheetItems, fechaVig, nombre)
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
