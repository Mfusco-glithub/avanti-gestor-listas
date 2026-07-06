import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('vw_pm_ultimo_precio')
      .select('monitor_id, descripcion, marca, sub_familia, grupo_comparable, precio, fecha, url')
      .eq('cadena', 'Tienda Inglesa')
      .order('sub_familia', { ascending: true })
      .order('marca', { ascending: true })
      .order('descripcion', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Write to output file for easy reading
    const fs = await import('fs')
    const lines: string[] = [`Total rows: ${data?.length ?? 0}`, '']
    lines.push('monitor_id | descripcion | marca | sub_familia | grupo_comparable | ultimo_pvp | ultima_fecha')
    lines.push('-'.repeat(120))
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const fecha = row.fecha ? String(row.fecha).split('T')[0] : 'NULL'
      lines.push(`${row.monitor_id} | ${row.descripcion} | ${row.marca} | ${row.sub_familia} | ${row.grupo_comparable ?? 'NULL'} | ${row.precio ?? 'NULL'} | ${fecha}`)
    }
    const outPath = 'D:\\Flowstica\\Projects\\gestor-listas\\monitor_table.txt'
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
    return NextResponse.json({ ok: true, rows: data?.length, path: outPath })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
