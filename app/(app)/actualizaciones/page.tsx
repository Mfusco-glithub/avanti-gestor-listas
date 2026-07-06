import { createClient } from '@/lib/supabase/server'
import { formatDate, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Download, Send } from 'lucide-react'

export default async function ActualizacionesPage() {
  const supabase = await createClient()

  const { data: actualizaciones } = await supabase
    .from('gl_actualizaciones')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actualizaciones de Precios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Historial completo de actualizaciones de listas</p>
        </div>
        <Link
          href="/actualizaciones/nueva"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Actualización
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vigencia</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Creado</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {actualizaciones && actualizaciones.length > 0 ? (
              actualizaciones.map(act => (
                <tr key={act.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <Link href={`/actualizaciones/${act.id}`} className="font-medium text-gray-900 hover:text-red-600">
                      {act.nombre ?? 'Sin nombre'}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(act.fecha_vigencia)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLORS[act.estado]}`}>
                      {ESTADO_LABELS[act.estado]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(act.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/actualizaciones/${act.id}`}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <p className="text-gray-400 text-sm">No hay actualizaciones aún</p>
                  <Link href="/actualizaciones/nueva" className="text-red-600 text-sm mt-2 inline-block hover:underline">
                    Crear la primera actualización →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
