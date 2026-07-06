'use client'

import { useState } from 'react'
import Paso1Calculo from '@/components/actualizaciones/Paso1Calculo'
import Paso2Listas from '@/components/actualizaciones/Paso2Listas'
import Paso3Envio from '@/components/actualizaciones/Paso3Envio'
import { Check } from 'lucide-react'

const PASOS = [
  { num: 1, label: 'Cálculo de Precios' },
  { num: 2, label: 'Listas por Cadena' },
  { num: 3, label: 'Envío de Emails' },
]

export interface ActualizacionState {
  actualizacionId: string | null
  nombre: string
  fechaVigencia: string
  items: ActualizacionItemUI[]
  cadenasSeleccionadas: string[]
}

export interface ActualizacionItemUI {
  sku_id: string
  cod_interno: string
  descripcion: string
  cadena_id: string
  cadena_nombre: string
  pcosto_anterior: number | null
  pcosto_nuevo: number
  delta_costo_pct: number | null
  pvp_anterior: number | null
  pvp_redondeado: number
  pvp_sin_iva: number
  delta_pvp_pct: number | null
  margen_pct: number
  fraccion_empresa: number
  ajuste_manual: boolean
}

export default function NuevaActualizacionPage() {
  const [paso, setPaso] = useState(1)
  const [state, setState] = useState<ActualizacionState>({
    actualizacionId: null,
    nombre: '',
    fechaVigencia: '',
    items: [],
    cadenasSeleccionadas: [],
  })

  function avanzar() {
    setPaso(p => Math.min(p + 1, 3))
  }

  function retroceder() {
    setPaso(p => Math.max(p - 1, 1))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Actualización de Precios</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Proceso de 3 pasos: cálculo → aprobación de listas → envío a cadenas
        </p>
      </div>

      {/* Steps indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center">
          {PASOS.map((p, i) => (
            <div key={p.num} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                    paso > p.num
                      ? 'bg-green-600 text-white'
                      : paso === p.num
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {paso > p.num ? <Check className="w-4 h-4" /> : p.num}
                </div>
                <span
                  className={`text-sm font-medium ${
                    paso === p.num ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    paso > p.num ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Paso actual */}
      {paso === 1 && (
        <Paso1Calculo
          state={state}
          setState={setState}
          onNext={avanzar}
        />
      )}
      {paso === 2 && (
        <Paso2Listas
          state={state}
          setState={setState}
          onNext={avanzar}
          onBack={retroceder}
        />
      )}
      {paso === 3 && (
        <Paso3Envio
          state={state}
          onBack={retroceder}
        />
      )}
    </div>
  )
}
