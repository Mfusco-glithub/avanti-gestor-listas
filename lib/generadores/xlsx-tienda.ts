/**
 * Generador lista Tienda Inglesa desde simulacion verificada
 * Formato: AVANTI (Masas), AVANTI PASTAS Y SALSAS, PASTAMANIA
 * Layout: sección izquierda (EAN, COD, DESC, UNIDADES, PRECIO SIN IMP, PVP)
 *         sección derecha "LISTA DE PRECIOS" (MARGEN, COSTO BASE S/IMP, COSTO BASE C/IMP, TOTAL CAJA)
 *         sección ANT (COSTO BASE ANT, COSTO BASE C/IMP ANT, AUMENTO)
 */
import ExcelJS from 'exceljs'

interface Item {
  ean: string
  cod_interno: string | number
  cod_cadena?: string | number   // código interno de Tienda Inglesa (de gl_cadena_skus)
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

// ── Helpers de grupo/familia ─────────────────────────────────────────────────
function isPastamania(marca: string) {
  return marca === 'PASTAMANIA' || marca === 'PASTAMANÍA'
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

const SF_ORDER = [
  'Copetin', 'Empanadas x 12', 'Empanadas x 20', 'Empanadas x 40', 'Empanadas XL', 'Empanadas x 6',
  'Tapas Redondas', 'Tapas Rectangulares', 'Masa Tarta',
  'Ravioles', 'Raviolones', 'Sorrentinos', 'Tallarines', 'Tagliatelle',
  'Pack Ravioles',
]
function sfRank(sf: string) {
  const i = SF_ORDER.indexOf(sf)
  return i === -1 ? 99 : i
}

// ── Definición de hojas ──────────────────────────────────────────────────────
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
    name: 'AVANTI',
    filter: (i) => i.familia === 'Masas' && !isPastamania(i.marca),
    getGroup: getMasasGroup,
    groupOrder: ['Masas para Empanadas', 'Masas para Tapas', 'Masas para Tartas', 'Masas Light'],
    accent: RED,
    pvpFill: LRED,
    footer: null,
  },
  {
    name: 'AVANTI PASTAS Y SALSAS',
    filter: (i) =>
      (i.familia === 'Pastas Frescas ATM' && !isPastamania(i.marca))
      || (i.familia === 'Salsas' && !isPastamania(i.marca)),
    getGroup: (i) => i.familia === 'Salsas' ? 'Salsas' : 'Pasta Fresca Envasada',
    groupOrder: ['Pasta Fresca Envasada', 'Salsas'],
    accent: RED,
    pvpFill: LRED,
    footer: null,
  },
  {
    name: 'PASTAMANIA',
    filter: (i) =>
      isPastamania(i.marca) && (i.familia === 'Masas' || i.sub_familia === 'Pack Ravioles' || i.familia === 'Pastas Frescas ATM'),
    getGroup: (i) => {
      if (i.sub_familia === 'Pack Ravioles' || i.familia === 'Pastas Frescas ATM') return 'Pasta Fresca Envasada'
      return getMasasGroup(i)
    },
    groupOrder: ['Masas para Empanadas', 'Masas para Tapas', 'Pasta Fresca Envasada'],
    accent: BLUE,
    pvpFill: LBLUE,
    footer: null,
  },
]

// ── Helpers de estilo ─────────────────────────────────────────────────────────
function bold(cell: ExcelJS.Cell, bg: string, fg = WHITE) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.font      = { bold: true, color: { argb: fg }, size: 8, name: 'Arial' }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function num(cell: ExcelJS.Cell, value: number | null, fmt = '"$"#,##0.00', bg = 'FFFFFFFF') {
  if (value === null || value === undefined) {
    cell.value = null
  } else {
    cell.value = value
    cell.numFmt = fmt
  }
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

// ── Función principal de hoja ─────────────────────────────────────────────────
function buildSheet(
  wb: ExcelJS.Workbook,
  def: SheetDef,
  sheetItems: Item[],
  cadena: string,
  fechaVig: string,
  nombre: string | null,
): void {
  if (sheetItems.length === 0) return

  const ws = wb.addWorksheet(def.name)

  // Columnas A-Q (17)
  // A: spacer | B: EAN | C: COD INTERNO (Avanti) | D: COD TIENDA (TI) | E: DESCRIPCION
  // F: UNIDADES | G: PRECIO SIN IMP | H: PVP
  // I: spacer | J: MARGEN | K: COSTO BASE S/IMP | L: COSTO BASE C/IMP | M: TOTAL CAJA S/IMP
  // N: spacer | O: COSTO BASE ANT | P: COSTO BASE C/IMP ANT | Q: AUMENTO
  ws.columns = [
    { width: 2  },  // A: margen visual
    { width: 18 },  // B: EAN
    { width: 10 },  // C: COD INTERNO (Avanti)
    { width: 10 },  // D: COD TIENDA (TI)
    { width: 44 },  // E: DESCRIPCION
    { width: 13 },  // F: UNIDADES PAQ/CAJA
    { width: 14 },  // G: PRECIO SIN IMP
    { width: 14 },  // H: SUG PUBLICO IMP INCL
    { width: 2  },  // I: spacer
    { width: 10 },  // J: MARGEN
    { width: 14 },  // K: COSTO BASE S/IMP
    { width: 16 },  // L: COSTO BASE C/IMP
    { width: 16 },  // M: TOTAL CAJA S/IMP
    { width: 2  },  // N: spacer
    { width: 14 },  // O: COSTO BASE S/IMP ANT
    { width: 16 },  // P: COSTO BASE C/IMP ANT
    { width: 10 },  // Q: AUMENTO
  ]

  // ── Fila 1: banner ─────────────────────────────────────────────────────────
  ws.getRow(1).height = 48
  ws.mergeCells('B1:M1')
  const bannerCell = ws.getCell('B1')
  const listaNombre = nombre ? `  —  ${nombre}` : ''
  bannerCell.value     = `LISTA DE PRECIOS TIENDA INGLESA${listaNombre}  |  Vigencia: ${fechaVig}`
  bannerCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
  bannerCell.font      = { bold: true, size: 13, name: 'Arial', color: { argb: WHITE } }
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Barra gris con "PRECIOS ANTERIORES" en sección ANT
  ws.mergeCells('O1:Q1')
  const antBanner = ws.getCell('O1')
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

    ws.mergeCells(`J${currentRow}:M${currentRow}`)
    const lpCell = ws.getCell(`J${currentRow}`)
    lpCell.value     = 'LISTA DE PRECIOS'
    lpCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.accent } }
    lpCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    lpCell.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.mergeCells(`O${currentRow}:Q${currentRow}`)
    const antCell = ws.getCell(`O${currentRow}`)
    antCell.value     = 'LISTA DE PRECIOS ANT'
    antCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
    antCell.font      = { bold: true, size: 9, name: 'Arial', color: { argb: WHITE } }
    antCell.alignment = { horizontal: 'center', vertical: 'middle' }

    currentRow++

    // ── Fila de cabeceras de columna ──────────────────────────────────────
    ws.getRow(currentRow).height = 30
    const hdr = [
      { col: 'B', txt: 'COD. BARRAS',                         bg: def.accent },
      { col: 'C', txt: 'COD.\nINTERNO',                        bg: def.accent },
      { col: 'D', txt: 'COD.\nTIENDA',                         bg: def.accent },
      { col: 'E', txt: 'DESCRIPCION',                         bg: def.accent },
      { col: 'F', txt: 'UNIDADES\nPAQ / CAJA',                bg: def.accent },
      { col: 'G', txt: 'PRECIOS\nSIN IMP',                    bg: def.accent },
      { col: 'H', txt: 'SUG. PUBLICO\nIMP INCL',              bg: def.accent },
      { col: 'J', txt: 'MARGEN',                              bg: def.accent },
      { col: 'K', txt: 'COSTO BASE\nS/IMP',                   bg: def.accent },
      { col: 'L', txt: 'COSTO BASE\nC/IMP',                   bg: def.accent },
      { col: 'M', txt: 'TOTAL CAJA\nS/IMP',                   bg: def.accent },
      { col: 'O', txt: 'COSTO BASE\nS/IMP',                   bg: GRAY },
      { col: 'P', txt: 'COSTO BASE\nC/IMP',                   bg: GRAY },
      { col: 'Q', txt: 'AUMENTO',                             bg: GRAY },
    ]
    for (const h of hdr) {
      const cell = ws.getCell(`${h.col}${currentRow}`)
      cell.value = h.txt
      bold(cell, h.bg)
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

        // Precios derivados
        const pvpSinIva     = item.pvp_sugerido / (1 + item.iva_rate)
        const precioNeto    = item.precio_neto
        const precioNetoCIva = item.precio_c_iva
        const mb            = item.pvp_sugerido > 0
          ? 1 - precioNetoCIva / item.pvp_sugerido
          : null
        const unidades      = item.unidades_caja_tienda ?? (typeof item.unidades_caja === 'number' ? item.unidades_caja : Number(item.unidades_caja) || null)
        const totalCaja     = unidades && precioNeto ? Math.round(precioNeto * unidades * 100) / 100 : null

        const prevNeto      = item.precio_neto_anterior
        const prevCIva      = item.precio_c_iva_anterior
        const aumento       = prevNeto && precioNeto ? (precioNeto - prevNeto) / prevNeto : null

        // Columna A: spacer
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }

        // Sección izquierda
        txt(ws.getCell(`B${currentRow}`), String(item.ean), bg, 'left')
        ws.getCell(`B${currentRow}`).numFmt = '@'

        txt(ws.getCell(`C${currentRow}`), item.cod_interno ? String(item.cod_interno) : '', bg, 'center')

        txt(ws.getCell(`D${currentRow}`), item.cod_cadena ? String(item.cod_cadena) : '', bg, 'center')

        txt(ws.getCell(`E${currentRow}`), item.descripcion, bg)

        txt(ws.getCell(`F${currentRow}`), unidades ? `${unidades} PAQ` : '', bg, 'center')

        num(ws.getCell(`G${currentRow}`), Math.round(pvpSinIva * 100) / 100, '"$"#,##0.00', bg)

        // PVP (highlight)
        num(ws.getCell(`H${currentRow}`), item.pvp_sugerido, '"$"#,##0.00', def.pvpFill)
        ws.getCell(`H${currentRow}`).font = { bold: true, size: 8, name: 'Arial' }

        // Spacer I
        ws.getCell(`I${currentRow}`).value = null

        // Sección LISTA DE PRECIOS
        if (mb !== null) {
          ws.getCell(`J${currentRow}`).value  = mb
          ws.getCell(`J${currentRow}`).numFmt = '0.0%'
          ws.getCell(`J${currentRow}`).font   = { bold: true, size: 8, name: 'Arial', color: { argb: mb >= 0.44 ? 'FF1B5E20' : 'FF7B1FA2' } }
          ws.getCell(`J${currentRow}`).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          ws.getCell(`J${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        }

        num(ws.getCell(`K${currentRow}`), precioNeto, '"$"#,##0.00', bg)
        num(ws.getCell(`L${currentRow}`), precioNetoCIva, '"$"#,##0.00', bg)
        num(ws.getCell(`M${currentRow}`), totalCaja, '"$"#,##0.00', bg)

        // Spacer N
        ws.getCell(`N${currentRow}`).value = null

        // Sección ANT
        num(ws.getCell(`O${currentRow}`), prevNeto, '"$"#,##0.00', bg)
        num(ws.getCell(`P${currentRow}`), prevCIva, '"$"#,##0.00', bg)

        if (aumento !== null) {
          ws.getCell(`Q${currentRow}`).value  = aumento
          ws.getCell(`Q${currentRow}`).numFmt = '0.0%'
          ws.getCell(`Q${currentRow}`).font   = { size: 8, name: 'Arial', color: { argb: aumento > 0 ? 'FF1B5E20' : 'FFC62828' } }
          ws.getCell(`Q${currentRow}`).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          ws.getCell(`Q${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        }

        currentRow++
      })

    currentRow++ // separador entre grupos
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  if (def.footer) {
    currentRow++
    ws.mergeCells(`B${currentRow}:M${currentRow}`)
    const fc = ws.getCell(`B${currentRow}`)
    fc.value     = def.footer
    fc.font      = { italic: true, size: 8, name: 'Arial', color: { argb: RED } }
    fc.alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getRow(currentRow).height = 16
  }
}

// ── Función principal exportada ───────────────────────────────────────────────
export async function generarTiendaXlsx({ items, cadena, vigencia, nombre }: Params): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Avanti Uruguay'
  wb.created  = new Date()

  const fechaVig = vigencia
    ? new Date(vigencia + 'T00:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  for (const def of SHEET_DEFS) {
    const sheetItems = items.filter(i => def.filter(i))
    buildSheet(wb, def, sheetItems, cadena, fechaVig, nombre)
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
