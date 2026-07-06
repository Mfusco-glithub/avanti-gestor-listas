import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Mapeo código GL (gl_lista_precios) ↔ nombre display (gl_cadenas)
const CADENA_TO_NOMBRE: Record<string, string> = {
  DISCO: 'Disco', DEVOTO: 'Devoto', GEANT: 'Géant',
  TATA: 'Ta-Ta', TIENDA: 'Tienda Inglesa', MACRO: 'Macro',
}
const NOMBRE_TO_CADENA: Record<string, string> = Object.fromEntries(
  Object.entries(CADENA_TO_NOMBRE).map(([k, v]) => [v, k])
)

// GET /api/simulaciones/[id]/replicar?cadena=DEVOTO
// Devuelve las otras cadenas del mismo grupo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createAdminClient()
    await params // necesario para params async
    const { searchParams } = new URL(request.url)
    const cadena = searchParams.get('cadena') ?? ''

    const nombreCadena = CADENA_TO_NOMBRE[cadena]
    if (!nombreCadena) return NextResponse.json({ grupo: null, companeras: [] })

    // Buscar grupo de la cadena
    const { data: cadenaRow } = await supabase
      .from('gl_cadenas')
      .select('grupo_cadena')
      .eq('tenant_id', TENANT_ID)
      .eq('nombre', nombreCadena)
      .single()

    const grupo = cadenaRow?.grupo_cadena ?? null
    if (!grupo) return NextResponse.json({ grupo: null, companeras: [] })

    // Buscar otras cadenas del mismo grupo
    const { data: companeras } = await supabase
      .from('gl_cadenas')
      .select('nombre')
      .eq('tenant_id', TENANT_ID)
      .eq('grupo_cadena', grupo)
      .neq('nombre', nombreCadena)

    const companeraCodes = (companeras ?? [])
      .map(c => NOMBRE_TO_CADENA[c.nombre])
      .filter(Boolean)

    return NextResponse.json({ grupo, companeras: companeraCodes })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/simulaciones/[id]/replicar
// Crea y ejecuta la simulación para las cadenas compañeras del grupo
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { cadenas_destino, vigencia_desde } = body as {
      cadenas_destino: string[]
      vigencia_desde?: string
    }

    if (!cadenas_destino?.length) {
      return NextResponse.json({ error: 'cadenas_destino requerido' }, { status: 400 })
    }

    // 1. Cargar simulación origen
    const { data: sim, error: simErr } = await supabase
      .from('gl_simulaciones')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
      .single()
    if (simErr) throw simErr

    // 2. Cargar items origen (pct_aumento por EAN)
    const { data: itemsOrigen, error: itemsErr } = await supabase
      .from('gl_simulacion_items')
      .select('ean, familia, sub_familia, descripcion, pct_aumento, precio_neto')
      .eq('simulacion_id', id)
    if (itemsErr) throw itemsErr

    const pctPorEan: Record<string, number> = {}
    for (const it of itemsOrigen ?? []) pctPorEan[it.ean] = it.pct_aumento
    const eans = Object.keys(pctPorEan)

    // 3. Obtener sku_id por EAN (compartido entre cadenas)
    const { data: skus } = await supabase
      .from('gl_skus')
      .select('id, ean')
      .eq('tenant_id', TENANT_ID)
      .in('ean', eans)

    const skuIdPorEan: Record<string, string> = {}
    for (const s of skus ?? []) { if (s.ean) skuIdPorEan[s.ean] = s.id }

    const vigencia = vigencia_desde ?? sim.vigencia_desde
    const resultados: { cadena: string; ok: boolean; actualizados: number; error?: string }[] = []

    for (const cadenaDest of cadenas_destino) {
      try {
        // 4. Obtener precios actuales de la cadena destino
        const { data: vistaRows } = await supabase
          .from('vw_margen_cadena')
          .select('ean, descripcion, familia, sub_familia, pvp_sugerido, precio_neto')
          .eq('cadena', cadenaDest)
          .in('ean', eans)

        const pvpPorEan: Record<string, {
          pvp: number; descripcion: string; familia: string; sub_familia: string; precio_neto: number
        }> = {}
        for (const row of vistaRows ?? []) {
          if (row.pvp_sugerido) {
            pvpPorEan[row.ean] = {
              pvp: parseFloat(row.pvp_sugerido),
              descripcion: row.descripcion ?? '',
              familia: row.familia ?? '',
              sub_familia: row.sub_familia ?? '',
              precio_neto: parseFloat(row.precio_neto),
            }
          }
        }

        // 5. Construir items para la cadena destino
        const items = eans
          .filter(ean => pvpPorEan[ean] !== undefined)
          .map(ean => {
            const base = pvpPorEan[ean]
            const pct = pctPorEan[ean] ?? 0
            const pvpNuevo = pct > 0 ? Math.round(base.pvp * (1 + pct / 100)) : base.pvp
            return {
              ean,
              familia: base.familia,
              sub_familia: base.sub_familia,
              descripcion: base.descripcion,
              pvp_base: base.pvp,
              pct_aumento: pct,
              pvp_nuevo: pvpNuevo,
              precio_neto: base.precio_neto,
            }
          })

        // 6. Crear simulación destino
        const { data: newSim, error: newSimErr } = await supabase
          .from('gl_simulaciones')
          .insert({
            tenant_id: TENANT_ID,
            nombre: sim.nombre,
            cadena: cadenaDest,
            vigencia_desde: vigencia,
            pct_global: sim.pct_global,
            pct_competencia: sim.pct_competencia,
            creado_por: sim.creado_por,
            family_targets: sim.family_targets,
            estado: 'borrador',
          })
          .select('id')
          .single()
        if (newSimErr) throw newSimErr

        // 7. Insertar items
        if (items.length > 0) {
          const { error: insErr } = await supabase
            .from('gl_simulacion_items')
            .insert(items.map(it => ({ ...it, simulacion_id: newSim.id })))
          if (insErr) throw insErr
        }

        // La simulación queda en borrador para que el usuario la revise y ejecute manualmente
        resultados.push({ cadena: cadenaDest, ok: true, actualizados: items.length })
      } catch (e) {
        resultados.push({
          cadena: cadenaDest, ok: false, actualizados: 0,
          error: e instanceof Error ? e.message : 'Error',
        })
      }
    }

    return NextResponse.json({ ok: true, resultados })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
