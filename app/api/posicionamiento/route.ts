import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Acepta ?cadenas=DISCO,DEVOTO o ?cadena=DISCO (backward compat)
    const cadenasParam = searchParams.get('cadenas') ?? searchParams.get('cadena') ?? ''
    const cadenasSeleccionadas = cadenasParam.split(',').map((s) => s.trim()).filter(Boolean)
    const semanas = parseInt(searchParams.get('semanas') ?? '8', 10)
    const familiaFiltro = searchParams.get('familia') ?? ''

    // 1. Cadenas disponibles (desde pm_monitoring)
    const { data: cadenasData } = await supabase
      .from('pm_monitoring')
      .select('cadena')
      .eq('activo', true)
    const cadenas = [...new Set((cadenasData ?? []).map((c) => c.cadena).filter(Boolean))].sort()

    // 2. Familias disponibles
    const { data: familiasData } = await supabase
      .from('gl_skus')
      .select('familia')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .not('familia', 'is', null)
    const familias = [...new Set((familiasData ?? []).map((f) => f.familia).filter(Boolean))].sort()

    if (cadenasSeleccionadas.length === 0) {
      return NextResponse.json({ cadenas, familias, filas: [] })
    }

    // 3. Periodo anti-promo
    const fechaDesde = new Date()
    fechaDesde.setDate(fechaDesde.getDate() - semanas * 7)

    // 4. Segmentos por marca
    const { data: segmentos } = await supabase
      .from('gl_marca_segmento')
      .select('marca, segmento')
      .eq('tenant_id', TENANT_ID)
    const segPorMarca: Record<string, string> = {}
    for (const s of segmentos ?? []) segPorMarca[s.marca] = s.segmento

    // 5. Todos los monitores de las cadenas seleccionadas (batch)
    const { data: todosMonitores } = await supabase
      .from('pm_monitoring')
      .select('monitor_id, producto_id, cadena')
      .in('cadena', cadenasSeleccionadas)
      .eq('activo', true)

    if (!todosMonitores?.length) {
      return NextResponse.json({ cadenas, familias, filas: [] })
    }

    const cadenaDeMonitor: Record<number, string> = {}
    const productoIdPorMonitor: Record<number, number> = {}
    for (const m of todosMonitores) {
      cadenaDeMonitor[m.monitor_id] = m.cadena
      productoIdPorMonitor[m.monitor_id] = m.producto_id
    }
    const todosMonitorIds = todosMonitores.map((m) => m.monitor_id)

    // 6. Precios en el periodo (batch para todas las cadenas)
    const { data: precios, error: preciosError } = await supabase
      .from('pm_precios')
      .select('monitor_id, precio, fecha')
      .in('monitor_id', todosMonitorIds)
      .gte('fecha', fechaDesde.toISOString())
      .not('precio', 'is', null)

    if (preciosError) throw preciosError

    // 7. Precio máximo por monitor
    const maxPrecioPorMonitor: Record<number, number> = {}
    for (const p of precios ?? []) {
      const precio = parseFloat(String(p.precio))
      if (!maxPrecioPorMonitor[p.monitor_id] || precio > maxPrecioPorMonitor[p.monitor_id]) {
        maxPrecioPorMonitor[p.monitor_id] = precio
      }
    }

    // 8. Productos con precio (incluye cadena)
    const productosConPrecio = Object.entries(maxPrecioPorMonitor)
      .map(([mid, precio]) => ({
        monitor_id: Number(mid),
        producto_id: productoIdPorMonitor[Number(mid)],
        precio,
        cadena: cadenaDeMonitor[Number(mid)],
      }))
      .filter((p) => p.producto_id)

    if (productosConPrecio.length === 0) {
      return NextResponse.json({ cadenas, familias, filas: [] })
    }

    const productoIds = [...new Set(productosConPrecio.map((p) => p.producto_id))]

    // 9. Datos de productos (pm_productos)
    const { data: pmProductos } = await supabase
      .from('pm_productos')
      .select('producto_id, descripcion, marca, familia, sub_familia, peso_unidad, grupo_comparable')
      .in('producto_id', productoIds)

    const pmPorId: Record<number, {
      descripcion: string; marca: string; familia: string
      sub_familia: string; peso_unidad: string; grupo_comparable: number | null
    }> = {}
    for (const prd of pmProductos ?? []) {
      pmPorId[prd.producto_id] = {
        descripcion: prd.descripcion ?? '',
        marca: prd.marca ?? '',
        familia: prd.familia ?? '',
        sub_familia: prd.sub_familia ?? '',
        peso_unidad: prd.peso_unidad ?? '',
        grupo_comparable: prd.grupo_comparable,
      }
    }

    // 10. grupo_comparable desde gl_skus (sobreescribe pm_productos)
    const { data: skusData } = await supabase
      .from('gl_skus')
      .select('producto_id, grupo_comparable')
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .in('producto_id', productoIds)
    const grupoPorProductoId: Record<number, number | null> = {}
    for (const s of skusData ?? []) {
      if (s.producto_id) grupoPorProductoId[s.producto_id] = s.grupo_comparable
    }

    // 11. Precio Avanti universal (desde última actualización aprobada)
    const { data: avantiItems } = await supabase
      .from('gl_actualizacion_items')
      .select('pvp_redondeado, gl_skus!inner(grupo_comparable, descripcion, marca, familia, sub_familia)')
      .eq('gl_skus.tenant_id', TENANT_ID)
      .eq('gl_skus.marca', 'AVANTI')
      .not('pvp_redondeado', 'is', null)
      .not('gl_skus.grupo_comparable', 'is', null)

    const avantPvpPorFamSubGrupo: Record<string, { precio: number; descripcion: string }> = {}
    for (const item of avantiItems ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sku = (item as any).gl_skus
      const grupo = sku?.grupo_comparable
      const fam = sku?.familia ?? ''
      const sub = sku?.sub_familia ?? ''
      if (grupo !== null && grupo !== undefined) {
        const key = `${fam}||${sub}||${grupo}`
        if (!(key in avantPvpPorFamSubGrupo)) {
          avantPvpPorFamSubGrupo[key] = {
            precio: parseFloat(String(item.pvp_redondeado)),
            descripcion: sku.descripcion ?? '',
          }
        }
      }
    }

    // 12. Precio Avanti por cadena desde gl_lista_precios (pvp_sugerido más reciente)
    const { data: avantiSkus } = await supabase
      .from('gl_skus')
      .select('id, grupo_comparable, familia, sub_familia')
      .eq('tenant_id', TENANT_ID)
      .eq('marca', 'AVANTI')
      .eq('activo', true)
      .not('grupo_comparable', 'is', null)

    const skuGrupoInfo: Record<string, { grupo_comparable: number; familia: string; sub_familia: string }> = {}
    for (const s of avantiSkus ?? []) {
      skuGrupoInfo[s.id] = {
        grupo_comparable: s.grupo_comparable,
        familia: s.familia ?? '',
        sub_familia: s.sub_familia ?? '',
      }
    }
    const avantiSkuIds = Object.keys(skuGrupoInfo)

    const avantiPorCadenaGrupo: Record<string, Record<string, number>> = {}
    if (avantiSkuIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: avantiLista } = await (supabase as any)
        .from('gl_lista_precios')
        .select('cadena, sku_id, pvp_sugerido, vigencia_desde')
        .in('cadena', cadenasSeleccionadas)
        .in('sku_id', avantiSkuIds)
        .not('pvp_sugerido', 'is', null)
        .order('vigencia_desde', { ascending: false })

      const seenKey = new Set<string>()
      for (const lp of avantiLista ?? []) {
        const info = skuGrupoInfo[lp.sku_id]
        if (!info) continue
        const grupoKey = `${info.familia}||${info.sub_familia}||${info.grupo_comparable}`
        const uniqueKey = `${lp.cadena}||${grupoKey}`
        if (!seenKey.has(uniqueKey)) {
          seenKey.add(uniqueKey)
          if (!avantiPorCadenaGrupo[grupoKey]) avantiPorCadenaGrupo[grupoKey] = {}
          if (lp.pvp_sugerido) {
            avantiPorCadenaGrupo[grupoKey][lp.cadena] = parseFloat(String(lp.pvp_sugerido))
          }
        }
      }
    }

    // 13. Construir filas agrupadas con datos por cadena
    type Competidor = {
      descripcion: string; marca: string; peso_unidad: string; sub_familia: string
      segmento: string | null; precio_max: number; pct_vs_avanti: number | null
    }
    type GrupoData = {
      grupo: number | null
      familia: string
      subfamilia: string
      avanti: { precio: number; descripcion: string } | null
      avanti_por_cadena: Record<string, number>
      por_cadena: Record<string, { competidores: Competidor[] }>
    }

    const grupos: Record<string, GrupoData> = {}

    for (const item of productosConPrecio) {
      const prd = pmPorId[item.producto_id]
      if (!prd) continue
      if (familiaFiltro && prd.familia !== familiaFiltro) continue

      const grupo = grupoPorProductoId[item.producto_id] ?? prd.grupo_comparable
      const familia = prd.familia ?? ''
      const subfamilia = prd.sub_familia ?? ''
      const grupoKey = grupo !== null
        ? `${familia}||${subfamilia}||${grupo}`
        : `sin_${item.producto_id}`

      if (!grupos[grupoKey]) {
        const avantKey = grupo !== null ? `${familia}||${subfamilia}||${grupo}` : null
        const avantData = avantKey ? (avantPvpPorFamSubGrupo[avantKey] ?? null) : null
        grupos[grupoKey] = {
          grupo,
          familia,
          subfamilia,
          avanti: avantData,
          avanti_por_cadena: avantKey ? (avantiPorCadenaGrupo[avantKey] ?? {}) : {},
          por_cadena: {},
        }
      }

      if (!grupos[grupoKey].por_cadena[item.cadena]) {
        grupos[grupoKey].por_cadena[item.cadena] = { competidores: [] }
      }

      // pct usando precio Avanti de esa cadena (si existe), sino universal
      const avantPrice =
        grupos[grupoKey].avanti_por_cadena[item.cadena] ??
        grupos[grupoKey].avanti?.precio ?? null
      const pct = avantPrice
        ? Math.round(((item.precio - avantPrice) / avantPrice) * 100)
        : null
      const segmento = prd.marca ? (segPorMarca[prd.marca] ?? null) : null

      grupos[grupoKey].por_cadena[item.cadena].competidores.push({
        descripcion: prd.descripcion,
        marca: prd.marca,
        peso_unidad: prd.peso_unidad,
        sub_familia: prd.sub_familia,
        segmento,
        precio_max: item.precio,
        pct_vs_avanti: pct,
      })
    }

    // Ordenar competidores por precio dentro de cada cadena
    for (const g of Object.values(grupos)) {
      for (const cData of Object.values(g.por_cadena)) {
        cData.competidores.sort((a, b) => b.precio_max - a.precio_max)
      }
    }

    const filas = Object.values(grupos).sort((a, b) => {
      const famCmp = a.familia.localeCompare(b.familia)
      if (famCmp !== 0) return famCmp
      const subCmp = a.subfamilia.localeCompare(b.subfamilia)
      if (subCmp !== 0) return subCmp
      if (a.grupo !== null && b.grupo !== null) return a.grupo - b.grupo
      if (a.grupo !== null) return -1
      if (b.grupo !== null) return 1
      return 0
    })

    return NextResponse.json({ cadenas, familias, filas })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Posicionamiento error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
