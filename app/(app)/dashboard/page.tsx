import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import Link from 'next/link'
import { TrendingUp, AlertTriangle, Package, Plus, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Última actualización
  const { data: ultimaActualizacion } = await supabase
    .from('gl_actualizaciones')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Conteo de actualizaciones por estado
  const { data: actualizaciones } = await supabase
    .from('gl_actualizaciones')
    .select('id, nombre, fecha_vigencia, estado, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // Últimos precios de competencia
  const { data: ultimosPrecios } = await supabase
    .from('vw_pm_ultimo_precio')
    .select('*')
    .not('precio', 'is', null)
    .order('fecha', { ascending: false })
    .limit(10)

  // Cadenas activas
  const { data: cadenas } = await supabase
    .from('gl_cadenas')
    .select('id')
    .eq('activo', true)

  // SKUs activos
  const { data: skus } = await supabase
    .from('gl_skus')
    .select('id')
    .eq('activo', true)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen de operaciones comerciales Avanti</p>
        </div>
        <Link
          href="/actualizaciones/nueva"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Actualización
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Cadenas Activas</span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{cadenas?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">canales de venta</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">SKUs en Catálogo</span>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{skus?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">productos activos</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Última Actualización</span>
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          {ultimaActualizacion ? (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {ultimaActualizacion.nombre ?? 'Sin nombre'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[ultimaActualizacion.estado]}`}>
                  {ESTADO_LABELS[ultimaActualizacion.estado]}
                </span>
                <span className="text-xs text-gray-400">
                  vigente {formatDate(ultimaActualizacion.fecha_vigencia)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin actualizaciones aún</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de actualizaciones */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Actualizaciones Recientes</h2>
            <Link href="/actualizaciones" className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {actualizaciones && actualizaciones.length > 0 ? (
              actualizaciones.map((act) => (
                <Link
                  key={act.id}
                  href={`/actualizaciones/${act.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {act.nombre ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Vigente: {formatDate(act.fecha_vigencia)}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLORS[act.estado]}`}>
                    {ESTADO_LABELS[act.estado]}
                  </span>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">No hay actualizaciones</p>
                <Link href="/actualizaciones/nueva" className="text-red-600 text-sm mt-2 inline-block hover:underline">
                  Crear la primera →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Precios de competencia */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Últimos Precios Relevados</h2>
            <Link href="/posicionamiento" className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
              Ver análisis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {ultimosPrecios && ultimosPrecios.length > 0 ? (
              ultimosPrecios.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.descripcion ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.cadena} · {p.fecha ? formatDate(p.fecha) : '—'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 ml-3 shrink-0">
                    {p.precio ? formatCurrency(p.precio) : '—'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">Sin precios relevados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
