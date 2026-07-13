import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Download, Send } from 'lucide-react'

export default async function ActualizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: actualizacion } = await supabase
    .from('gl_actualizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (!actualizacion) notFound()

  const { data: items } = await supabase
    .from('gl_actualizacion_items')
    .select('*, gl_skus(cod_interno, descripcion, familia), gl_cadenas(nombre)')
    .eq('actualizacion_id', id)
    .limit(200)

  const { data: archivos } = await supabase
    .from('gl_archivos')
    .select('*, gl_cadenas(nombre)')
    .eq('actualizacion_id', id)

  const { data: envios } = await supabase
    .from('gl_envios')
    .select('*, gl_cadenas(nombre)')
    .eq('actualizacion_id', id)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/actualizaciones" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {actualizacion.nombre ?? 'Actualización sin nombre'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLORS[actualizacion.estado]}`}>
              {ESTADO_LABELS[actualizacion.estado]}
            </span>
            <span className="text-sm text-gray-400">Vigencia: {formatDate(actualizacion.fecha_vigencia)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Items */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Ítems ({items?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">Cadena</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase">PVP nuevo</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items?.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {(item.gl_skus as any)?.descripcion ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{(item.gl_cadenas as any)?.nombre ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {item.pvp_redondeado ? formatCurrency(item.pvp_redondeado) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">
                      {item.margen_pct ? `${(item.margen_pct * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: archivos + envíos */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" /> Archivos generados
            </h3>
            {archivos && archivos.length > 0 ? (
              archivos.map(arch => (
                <div key={arch.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{(arch.gl_cadenas as any)?.nombre ?? '—'}</span>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{arch.tipo}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">Sin archivos generados</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" /> Log de envíos
            </h3>
            {envios && envios.length > 0 ? (
              envios.map(envio => (
                <div key={envio.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{(envio.gl_cadenas as any)?.nombre ?? '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    envio.estado === 'enviado' ? 'bg-green-50 text-green-700' :
                    envio.estado === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {envio.estado}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">Sin envíos registrados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
