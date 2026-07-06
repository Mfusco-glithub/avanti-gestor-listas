/**
 * Parser de listas de precios en Excel → filas para gl_lista_precios.
 *
 * Un mismo Excel trae una hoja por línea de producto, y dentro de cada hoja la
 * cabecera ("COD. BARRAS ...") se repite por cada sub-sección. Las columnas NO
 * están en índices fijos: hay varios formatos según la cadena. Por eso el mapeo
 * de columnas se detecta DINÁMICAMENTE por el nombre del header, nunca por
 * índice fijo. Esto evita el bug sistemático de tomar el PVP como precio_iva.
 *
 * Formatos observados:
 *   A (GDU Disco/Devoto/Geant): EAN, COD_INTERNO, COD_GRUPO_DISCO, DESC, UNID,
 *                               PRECIO SIN IVA, PRECIO FACT IVA, PVP  → neto=col5
 *   B (TATA y la mayoría, sin col de código de cadena): EAN, COD_INTERNO, DESC,
 *                               UNID, PRECIO SIN IVA, PRECIO FACT IVA, PVP → neto=col4
 *   C (hoja TUTTI PASTA / QUE FACIL, con COD Ta-Ta): igual a A → neto=col5
 *   D (MACRO): SIN columna precio_iva y header "PRECIO SIN IMP":
 *                               EAN, COD_INTERNO, DESC, UNID, PRECIO SIN IMP, PVP → neto=col4
 *   E (TIENDA INGLESA): tiene "COSTO BASE S/IMP" además de "PRECIOS SIN IMP", y el PVP
 *                       se llama "SUG. PUBLICO IMP INCL". OJO: el precio_neto que va a
 *                       Supabase es el COSTO BASE (col9), NO "PRECIOS SIN IMP" (col5):
 *                       EAN, COD_INTERNO, COD_TIENDA, DESC, UNID, PRECIOS SIN IMP,
 *                       SUG. PUBLICO IMP INCL, (vacío), MARGEN, COSTO BASE S/IMP
 *
 * Regla de oro (se resuelve por nombre de columna, no por posición):
 *   precio_neto   = "COSTO BASE" si existe (Tienda) ; sino "PRECIO(S) SIN IVA/IMP" / "S/IVA"
 *   precio_iva    = "PRECIO FACT IVA x% INC" / "C/IVA" / "CON IVA"   (la que se confunde con PVP)
 *                   → OPCIONAL: si la columna no existe (MACRO/Tienda), queda null y el
 *                     consumidor lo calcula como neto×(1+iva_rate). Nunca se usa el PVP.
 *   pvp_sugerido  = "PVP SUGERIDO" / "SUG. PUBLICO" (Tienda)
 *
 * El descuento del 25% de las notas al pie se aplica en factura, NO en la lista:
 * este parser importa los precios de lista tal cual.
 */
import * as XLSX from 'xlsx'

export interface ListaItem {
  hoja: string
  ean: string
  cod_interno: string
  descripcion: string
  unidades_caja: string
  precio_neto: number
  precio_iva: number | null   // col detectada tal cual; null si viene vacía en el Excel
  pvp_sugerido: number
}

export interface HojaReporte {
  hoja: string
  secciones: number     // cabeceras detectadas dentro de la hoja
  filas_datos: number
  importadas: number
  saltadas: number
  omitida?: string
}

export interface ParseResult {
  items: ListaItem[]
  hojas: HojaReporte[]
  warnings: string[]
}

interface ColMap {
  ean: number
  cod_interno: number
  descripcion: number
  unidades: number
  precio_neto: number
  precio_iva: number
  pvp_sugerido: number
}

function norm(v: unknown): string {
  return String(v ?? '').toUpperCase().replace(/\s+/g, ' ').trim()
}

/** Parsea número en formato UY ("1.234,56") o simple ("1234.56" / number). */
export function parseNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).replace(/\$/g, '').replace(/\s/g, '').trim()
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.') // UY: . miles, , decimal
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/** ¿La celda parece un EAN? (numérico, 8–14 dígitos). */
function esEan(v: unknown): boolean {
  return /^\d{8,14}$/.test(String(v ?? '').trim())
}

/** ¿La fila es una cabecera de sección? (contiene "COD. BARRAS"). */
function esCabecera(row: unknown[]): boolean {
  return row.some(c => norm(c).includes('BARRAS'))
}

/**
 * Construye el mapeo de columnas leyendo los nombres del header de la sección.
 * Devuelve null si falta alguna columna obligatoria (ean/neto/iva/pvp).
 */
function detectarColumnas(header: unknown[]): ColMap | null {
  const cells = header.map(norm)
  const find = (pred: (s: string) => boolean) => cells.findIndex(pred)

  const esNeto = (s: string) => s.includes('SIN IVA') || s.includes('S/IVA') || s.includes('SIN IMP')
  const esPvp = (s: string) => s.includes('PVP') || s.includes('SUG') || s.includes('PUBLICO')

  const ean = find(s => s.includes('BARRAS'))
  const cod_interno = find(s => s.includes('INTERNO'))
  const descripcion = find(s => s.includes('DESCRIPC'))
  const unidades = find(s => s.includes('UNIDAD'))
  // precio_neto: prioridad a "COSTO BASE" (Tienda: "PRECIOS SIN IMP" NO es el neto);
  // sino la columna "PRECIO(S) SIN IVA/IMP".
  const idxCostoBase = find(s => s.includes('COSTO BASE'))
  const precio_neto = idxCostoBase >= 0 ? idxCostoBase : find(esNeto)
  const pvp_sugerido = find(esPvp)
  // precio_iva: la columna con IVA incluido — nunca neto/pvp/costo. OPCIONAL:
  // puede no existir (MACRO/Tienda), en cuyo caso queda -1 y el consumidor lo calcula.
  const precio_iva = find(s =>
    !esNeto(s) && !esPvp(s) && !s.includes('COSTO BASE') &&
    (s.includes('FACT IVA') || s.includes('C/IVA') || s.includes('CON IVA') ||
     (s.includes('IVA') && s.includes('INC')))
  )

  // Obligatorias: EAN, precio_neto y PVP. precio_iva es opcional (-1 = ausente).
  if (ean < 0 || precio_neto < 0 || pvp_sugerido < 0) return null
  return { ean, cod_interno, descripcion, unidades, precio_neto, precio_iva, pvp_sugerido }
}

export function parseListaXlsWorkbook(workbook: XLSX.WorkBook): ParseResult {
  const items: ListaItem[] = []
  const hojas: HojaReporte[] = []
  const warnings: string[] = []

  for (const hoja of workbook.SheetNames) {
    const ws = workbook.Sheets[hoja]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1, defval: null, raw: true, blankrows: false,
    })

    let col: ColMap | null = null
    let secciones = 0
    let filasDatos = 0
    let importadas = 0
    let saltadas = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? []

      // Cabecera de sección → re-detectar columnas (el header se repite por sub-sección).
      if (esCabecera(row)) {
        col = detectarColumnas(row)
        if (col) {
          secciones++
        } else {
          warnings.push(`Hoja "${hoja}", fila ${i + 1}: cabecera sin columnas neto/IVA/PVP reconocibles — sección ignorada.`)
        }
        continue
      }

      if (!col) continue // datos antes de cualquier cabecera válida → ignorar
      const eanRaw = row[col.ean]
      if (!esEan(eanRaw)) continue // sección, blanco o nota al pie
      filasDatos++

      const ean = String(eanRaw).trim()
      const precioNeto = parseNum(row[col.precio_neto])
      const precioIva = col.precio_iva >= 0 ? parseNum(row[col.precio_iva]) : null
      const pvp = parseNum(row[col.pvp_sugerido])

      if (precioNeto == null || precioNeto <= 0 || pvp == null || pvp <= 0) {
        saltadas++
        warnings.push(`Hoja "${hoja}", EAN ${ean}: precio_neto/pvp inválidos — fila saltada.`)
        continue
      }

      items.push({
        hoja,
        ean,
        cod_interno: String(row[col.cod_interno] ?? '').trim(),
        descripcion: String(row[col.descripcion] ?? '').trim(),
        unidades_caja: String(row[col.unidades] ?? '').trim(),
        precio_neto: Math.round(precioNeto * 100) / 100,
        precio_iva: precioIva != null && precioIva > 0 ? Math.round(precioIva * 100) / 100 : null,
        pvp_sugerido: Math.round(pvp * 100) / 100,
      })
      importadas++
    }

    hojas.push(
      secciones === 0
        ? { hoja, secciones, filas_datos: 0, importadas: 0, saltadas: 0, omitida: 'sin cabecera de datos' }
        : { hoja, secciones, filas_datos: filasDatos, importadas, saltadas }
    )
  }

  return { items, hojas, warnings }
}
