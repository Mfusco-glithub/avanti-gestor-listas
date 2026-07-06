/**
 * Calculadora de precios para Avanti Uruguay
 * Lógica de negocio central para actualización de listas de precios
 */

export interface ParametrosCalculo {
  pcosto_nuevo: number
  iva_rate: number // 0.10 | 0.22 | 0
  tipo_regla: 'margen_fijo' | 'pvp_objetivo' | 'relativo_competidor' | 'mantener'
  margen_objetivo_pct?: number
  pvp_objetivo?: number
  precio_competidor?: number
  delta_vs_competidor_pct?: number
  pvp_anterior?: number
}

export interface ResultadoCalculo {
  pvp_bruto_sin_iva: number
  pvp_bruto_con_iva: number
  pvp_redondeado: number
  pvp_sin_iva: number
  fraccion_empresa: number
  margen_pct: number
  delta_pvp_pct: number | null
}

/**
 * Redondea hacia abajo al terminado ,99 o ,95 más cercano.
 * La fracción siempre queda a favor de la empresa.
 *
 * Ejemplos:
 *   159.45 → 158.99 (baja a ,99 previo)
 *   159.72 → 159.95? No, 159.45→158.99, 159.60→158.99 ó 159.95?
 *   Lógica: buscar la terminación candidata más alta que sea <= al precio bruto
 */
export function redondearPVP(pvpBruto: number): number {
  const entero = Math.floor(pvpBruto)
  const decimales = pvpBruto - entero

  // Candidatos en orden descendente: X.99, X.95
  if (decimales >= 0.99) {
    return entero + 0.99
  }
  if (decimales >= 0.95) {
    return entero + 0.95
  }
  if (decimales >= 0) {
    // Bajar al .99 del entero anterior
    return (entero - 1) + 0.99
  }

  return Math.floor(pvpBruto * 100) / 100
}

/**
 * Calcula el PVP nuevo dado el costo y la regla de posicionamiento.
 */
export function calcularPVP(params: ParametrosCalculo): ResultadoCalculo {
  const { pcosto_nuevo, iva_rate, tipo_regla, pvp_anterior } = params

  let pvp_bruto_sin_iva: number

  switch (tipo_regla) {
    case 'margen_fijo': {
      const margen = params.margen_objetivo_pct ?? 0
      pvp_bruto_sin_iva = pcosto_nuevo * (1 + margen)
      break
    }
    case 'pvp_objetivo': {
      const pvp_obj = params.pvp_objetivo ?? pcosto_nuevo * 1.3
      pvp_bruto_sin_iva = pvp_obj / (1 + iva_rate)
      break
    }
    case 'relativo_competidor': {
      const precio_comp = params.precio_competidor ?? pcosto_nuevo * 1.4
      const delta = params.delta_vs_competidor_pct ?? 0
      pvp_bruto_sin_iva = precio_comp * (1 + delta) / (1 + iva_rate)
      break
    }
    case 'mantener': {
      if (!pvp_anterior) throw new Error('mantener requiere pvp_anterior')
      pvp_bruto_sin_iva = pvp_anterior / (1 + iva_rate)
      break
    }
    default:
      throw new Error(`Tipo de regla desconocido: ${tipo_regla}`)
  }

  const pvp_bruto_con_iva = pvp_bruto_sin_iva * (1 + iva_rate)
  const pvp_redondeado = redondearPVP(pvp_bruto_con_iva)
  const pvp_sin_iva = pvp_redondeado / (1 + iva_rate)
  const fraccion_empresa = pvp_bruto_con_iva - pvp_redondeado

  // Margen real = (PVP s/IVA - Costo) / Costo
  const margen_pct = (pvp_sin_iva - pcosto_nuevo) / pcosto_nuevo

  const delta_pvp_pct = pvp_anterior
    ? (pvp_redondeado - pvp_anterior) / pvp_anterior
    : null

  return {
    pvp_bruto_sin_iva,
    pvp_bruto_con_iva,
    pvp_redondeado,
    pvp_sin_iva,
    fraccion_empresa,
    margen_pct,
    delta_pvp_pct,
  }
}

/**
 * Semáforo de margen:
 * Verde: margen >= objetivo
 * Amarillo: margen entre (objetivo - 5pp) y objetivo
 * Rojo: margen < (objetivo - 5pp)
 */
export type ColorSemaforo = 'verde' | 'amarillo' | 'rojo'

export function calcularSemaforo(
  margen_actual: number,
  margen_objetivo: number
): ColorSemaforo {
  if (margen_actual >= margen_objetivo) return 'verde'
  if (margen_actual >= margen_objetivo - 0.05) return 'amarillo'
  return 'rojo'
}

/**
 * Parsea el archivo XLS de ingeniería de precios.
 * Espera columnas: cod_interno, descripcion, pcosto_nuevo
 * Returns array de items listos para calcular.
 */
export interface ItemIngenieria {
  cod_interno: string
  descripcion: string
  pcosto_nuevo: number
}

export function parsearArchivoIngenieria(rows: Record<string, unknown>[]): ItemIngenieria[] {
  return rows
    .filter(row => row['cod_interno'] || row['COD_INTERNO'] || row['Cod. Interno'])
    .map(row => ({
      cod_interno: String(
        row['cod_interno'] ?? row['COD_INTERNO'] ?? row['Cod. Interno'] ?? ''
      ).trim(),
      descripcion: String(
        row['descripcion'] ?? row['DESCRIPCION'] ?? row['Descripción'] ?? ''
      ).trim(),
      pcosto_nuevo: parseFloat(
        String(
          row['pcosto_nuevo'] ?? row['PCOSTO_NUEVO'] ?? row['Costo Nuevo'] ?? row['costo_nuevo'] ?? 0
        ).replace(',', '.')
      ),
    }))
    .filter(item => item.cod_interno && item.pcosto_nuevo > 0)
}

/**
 * Calcula el porcentaje promedio de aumento para el cuerpo del email
 */
export function calcularAumentoProm(items: { delta_pvp_pct: number | null }[]): number {
  const validos = items.filter(i => i.delta_pvp_pct !== null && i.delta_pvp_pct > 0)
  if (!validos.length) return 0
  const suma = validos.reduce((acc, i) => acc + (i.delta_pvp_pct ?? 0), 0)
  return suma / validos.length
}
