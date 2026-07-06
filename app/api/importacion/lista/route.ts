import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseListaXlsWorkbook, type ListaItem } from '@/lib/importacion/parse-lista-xls'
import * as XLSX from 'xlsx'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Códigos de cadena válidos en gl_lista_precios.cadena (mismos que CADENA_IDS en
// listas/generar). Se validan las cadenas destino contra este set para no escribir
// códigos inexistentes. GDU (Disco/Devoto/Geant) comparten un único Excel.
const CADENAS_VALIDAS = new Set([
  'DISCO', 'DEVOTO', 'GEANT', 'GDU', 'TATA', 'TIENDA', 'MACRO', 'PEDIDOSYA', 'INTERIOR', 'COMERCIO',
])

interface SkuInfo { id: string; cod_interno: string; iva_rate: number }

/**
 * POST /api/importacion/lista
 * Importa un Excel de lista de precios multi-hoja a gl_lista_precios con fuente='xls'.
 * Sirve para cualquier cadena — GDU (Disco/Devoto/Geant, un mismo Excel → 3 cadenas),
 * TATA, MACRO, etc. El parser detecta las columnas por nombre (formatos A/B/C/D).
 *
 * FormData:
 *   file       (requerido)  .xls/.xlsx de la lista
 *   vigencia   (requerido)  YYYY-MM-DD  → vigencia_desde
 *   cadenas    (requerido)  CSV de códigos destino (ej. "DISCO,DEVOTO,GEANT" o "MACRO")
 *   dry_run    (opcional)   'true' → parsea y devuelve preview sin escribir
 *
 * Mapeo por nombre de columna (nunca índice fijo): precio_neto="SIN IVA"/"SIN IMP",
 * precio_iva="FACT IVA"/"C/IVA" (si falta, se calcula neto×(1+iva_rate)), pvp="PVP".
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const vigencia = String(formData.get('vigencia') ?? '').trim()
    const dryRun = String(formData.get('dry_run') ?? '') === 'true'

    const cadenasPedidas = String(formData.get('cadenas') ?? '')
      .split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
    const cadenas = [...new Set(cadenasPedidas)]
    const cadenasInvalidas = cadenas.filter(c => !CADENAS_VALIDAS.has(c))

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vigencia))
      return NextResponse.json({ error: 'vigencia debe tener formato YYYY-MM-DD' }, { status: 400 })
    if (!cadenas.length)
      return NextResponse.json({ error: `Falta "cadenas". Válidas: ${[...CADENAS_VALIDAS].join(', ')}` }, { status: 400 })
    if (cadenasInvalidas.length)
      return NextResponse.json({
        error: `Cadenas inválidas: ${cadenasInvalidas.join(', ')}. Válidas: ${[...CADENAS_VALIDAS].join(', ')}`,
      }, { status: 400 })

    // ── Parsear Excel ────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const parsed = parseListaXlsWorkbook(workbook)

    if (!parsed.items.length) {
      return NextResponse.json({
        error: 'El Excel no tiene filas de datos válidas.',
        hojas: parsed.hojas,
        warnings: parsed.warnings,
      }, { status: 400 })
    }

    // ── Resolver sku_id por EAN (fallback cod_interno) ───────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createAdminClient() as any
    const { data: skus } = await supabase
      .from('gl_skus')
      .select('id, ean, cod_interno, iva_rate')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)

    const skuPorEan = new Map<string, SkuInfo>()
    const skuPorCod = new Map<string, SkuInfo>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (skus ?? []) as any[]) {
      const info: SkuInfo = {
        id: s.id,
        cod_interno: s.cod_interno != null ? String(s.cod_interno) : '',
        iva_rate: s.iva_rate != null ? parseFloat(String(s.iva_rate)) : 0.22,
      }
      if (s.ean) skuPorEan.set(String(s.ean).trim(), info)
      if (s.cod_interno != null) skuPorCod.set(String(s.cod_interno).trim(), info)
    }

    const resolverSku = (item: ListaItem): SkuInfo | null =>
      skuPorEan.get(item.ean) ?? (item.cod_interno ? skuPorCod.get(item.cod_interno) ?? null : null)

    // ── Construir filas (una por cadena × SKU) ───────────────────────────────
    const warnings = [...parsed.warnings]
    const sinMatch: { ean: string; cod_interno: string; descripcion: string; hoja: string }[] = []
    const rows: Record<string, unknown>[] = []
    let ivaCalculado = 0

    for (const item of parsed.items) {
      const sku = resolverSku(item)
      if (!sku) {
        sinMatch.push({ ean: item.ean, cod_interno: item.cod_interno, descripcion: item.descripcion, hoja: item.hoja })
        continue
      }

      // precio_iva: se toma de la columna del Excel tal cual. Si el Excel no la trae
      // (MACRO), se calcula desde el neto (fallback) y se avisa — nunca se usa el PVP.
      let precioIva = item.precio_iva
      if (precioIva == null) {
        precioIva = Math.round(item.precio_neto * (1 + sku.iva_rate) * 100) / 100
        ivaCalculado++
        warnings.push(`EAN ${item.ean} (${item.hoja}): precio_iva ausente en el Excel; calculado como neto×(1+IVA).`)
      }

      for (const cadena of cadenas) {
        rows.push({
          tenant_id: TENANT_ID,
          cadena,
          sku_id: sku.id,
          cod_interno: sku.cod_interno || item.cod_interno || null,
          ean: item.ean,
          precio_neto: item.precio_neto,
          precio_iva: precioIva,
          pvp_sugerido: item.pvp_sugerido,
          vigencia_desde: vigencia,
          fuente: 'xls',
        })
      }
    }

    const resumen = {
      vigencia,
      cadenas,
      hojas: parsed.hojas,
      items_en_excel: parsed.items.length,
      items_con_sku: parsed.items.length - sinMatch.length,
      sin_match: sinMatch.length,
      filas_a_escribir: rows.length,
      precio_iva_calculado: ivaCalculado,
      sin_match_detalle: sinMatch,
      warnings,
    }

    // ── Dry-run: preview sin escribir ────────────────────────────────────────
    if (dryRun) {
      return NextResponse.json({ ok: true, dry_run: true, ...resumen, muestra: rows.slice(0, 20) })
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'Ningún ítem del Excel coincide con un SKU activo.', ...resumen }, { status: 400 })
    }

    // ── Upsert por lotes ─────────────────────────────────────────────────────
    for (let i = 0; i < rows.length; i += 500) {
      const { error: upsErr } = await supabase
        .from('gl_lista_precios')
        .upsert(rows.slice(i, i + 500), { onConflict: 'tenant_id,cadena,sku_id,vigencia_desde' })
      if (upsErr) throw upsErr
    }

    // ── Guardar el archivo original para trazabilidad ────────────────────────
    const ext = (file.name.split('.').pop() || 'xlsx').toLowerCase()
    const filePath = `importaciones/${cadenas.join('-').toLowerCase()}/${vigencia}_${Date.now()}.${ext}`
    await supabase.storage.from('gl-archivos').upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })

    return NextResponse.json({ ok: true, dry_run: false, filas_escritas: rows.length, archivo: filePath, ...resumen })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[importacion-lista] error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
