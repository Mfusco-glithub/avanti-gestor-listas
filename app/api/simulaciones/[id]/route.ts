import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// GET /api/simulaciones/[id] — cargar simulación con items
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: sim, error: simErr } = await supabase
      .from('gl_simulaciones')
      .select('*, grupos_snapshot')
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
      .single()
    if (simErr) throw simErr

    const { data: items, error: itemsErr } = await supabase
      .from('gl_simulacion_items')
      .select('*')
      .eq('simulacion_id', id)
    if (itemsErr) throw itemsErr

    return NextResponse.json({ simulacion: sim, items: items ?? [] })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/simulaciones/[id] — actualizar (nombre, vigencia, estado, items)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params
    const body = await request.json()

    const { nombre, vigencia_desde, estado, pct_global, pct_competencia, creado_por, family_targets, grupos_snapshot, items } = body

    // Actualizar cabecera
    const update: Record<string, unknown> = {}
    if (nombre !== undefined) update.nombre = nombre
    if (vigencia_desde !== undefined) update.vigencia_desde = vigencia_desde
    if (estado !== undefined) update.estado = estado
    if (pct_global !== undefined) update.pct_global = pct_global
    if (pct_competencia !== undefined) update.pct_competencia = pct_competencia
    if (creado_por !== undefined) update.creado_por = creado_por
    if (family_targets !== undefined) update.family_targets = family_targets
    if (grupos_snapshot !== undefined) update.grupos_snapshot = grupos_snapshot

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from('gl_simulaciones')
        .update(update)
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)
      if (error) throw error
    }

    // Si vienen items, reemplazar solo las familias indicadas (o todas si no se especifica)
    if (items !== undefined) {
      const familias_actualizar: string[] | undefined = body.familias_actualizar
      if (familias_actualizar && familias_actualizar.length > 0) {
        // Parcial: borrar solo items de las familias que se están actualizando
        await supabase
          .from('gl_simulacion_items')
          .delete()
          .eq('simulacion_id', id)
          .in('familia', familias_actualizar)
      } else {
        // Total: reemplazar todos (primer guardado)
        await supabase.from('gl_simulacion_items').delete().eq('simulacion_id', id)
      }
      if (items.length > 0) {
        const { error } = await supabase
          .from('gl_simulacion_items')
          .insert(items.map((it: Record<string, unknown>) => ({ ...it, simulacion_id: id })))
        if (error) throw error
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/simulaciones/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params

    const { error } = await supabase
      .from('gl_simulaciones')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
