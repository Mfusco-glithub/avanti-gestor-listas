import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const PAGE_SIZE = 30

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') ?? ''
    const familia = searchParams.get('familia') ?? ''
    const subfamilia = searchParams.get('subfamilia') ?? ''
    const sinEan = searchParams.get('sin_ean') === '1'
    const sinGrupo = searchParams.get('sin_grupo') === '1'
    const soloInactivos = searchParams.get('inactivos') === '1'
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

    // Familias para el filtro
    const { data: familiasData } = await supabase
      .from('gl_skus')
      .select('familia')
      .eq('tenant_id', TENANT_ID)
      .not('familia', 'is', null)

    const familias = [
      ...new Set((familiasData ?? []).map((f) => f.familia).filter(Boolean)),
    ].sort() as string[]

    // Subfamilias para el filtro (filtradas por familia si hay una seleccionada)
    let subfamiliasQuery = supabase
      .from('gl_skus')
      .select('sub_familia')
      .eq('tenant_id', TENANT_ID)
      .not('sub_familia', 'is', null)
    if (familia) subfamiliasQuery = subfamiliasQuery.eq('familia', familia)
    const { data: subfamiliasData } = await subfamiliasQuery
    const subfamilias = [
      ...new Set((subfamiliasData ?? []).map((f) => f.sub_familia).filter(Boolean)),
    ].sort() as string[]

    // Query principal
    let query = supabase
      .from('gl_skus')
      .select('*', { count: 'exact' })
      .eq('tenant_id', TENANT_ID)
      .order('familia', { ascending: true, nullsFirst: false })
      .order('descripcion')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (!soloInactivos) {
      // mostrar todos (activos e inactivos) a menos que se pida solo inactivos
    } else {
      query = query.eq('activo', false)
    }

    if (search) {
      query = query.or(
        `descripcion.ilike.%${search}%,ean.ilike.%${search}%,cod_interno.ilike.%${search}%`
      )
    }
    if (familia) {
      query = query.eq('familia', familia)
    }
    if (subfamilia) {
      query = query.eq('sub_familia', subfamilia)
    }
    if (sinEan) {
      query = query.is('ean', null)
    }
    if (sinGrupo) {
      query = query.is('grupo_comparable', null)
    }

    const { data: skus, count, error } = await query
    if (error) throw error

    return NextResponse.json({
      skus: skus ?? [],
      total: count ?? 0,
      familias,
      subfamilias,
      pageSize: PAGE_SIZE,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    if (body.action === 'update') {
      const { id, campos } = body as {
        id: string
        campos: Record<string, unknown>
      }
      // Filtrar campos no editables
      const { id: _id, tenant_id: _t, producto_id: _p, created_at: _c, ...editables } = campos as Record<string, unknown> & {
        id?: unknown; tenant_id?: unknown; producto_id?: unknown; created_at?: unknown
      }
      void _id; void _t; void _p; void _c

      const { error } = await supabase
        .from('gl_skus')
        .update(editables)
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'create') {
      const { sku } = body as { sku: Record<string, unknown> }
      // Limpiar campos que no deben enviarse en create
      const { id: _id, tenant_id: _t, created_at: _c, producto_id: _p, ...campos } = sku as Record<string, unknown> & {
        id?: unknown; tenant_id?: unknown; created_at?: unknown; producto_id?: unknown
      }
      void _id; void _t; void _c; void _p

      const { error } = await supabase
        .from('gl_skus')
        .insert({ ...campos, tenant_id: TENANT_ID, activo: campos.activo ?? true })

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
