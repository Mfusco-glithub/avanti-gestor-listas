/**
 * Traducción de código de exportación.
 *
 * Algunos SKUs llevan un sufijo de letra en su `cod_interno` para evitar
 * colisiones internas en `gl_skus` con otros productos que ya ocupaban ese
 * número. Por ejemplo, productos LA ESPECIALISTA usan "214E", "217E", "71E" y
 * "78E" porque esos números base pertenecen a otros productos.
 * Ese sufijo existe SOLO dentro de nuestra base: el sistema externo al que se
 * importa la lista espera el código original, sin la letra (214, 217, 71, 78).
 *
 * Regla: si el código es una parte numérica seguida de una o más letras, se
 * devuelve solo la parte numérica. Cualquier otro formato (puramente numérico,
 * alfanumérico mixto, etc.) queda intacto.
 */
export function codigoExportacion(codInterno: string | number | null | undefined): string {
  if (codInterno === null || codInterno === undefined) return ''
  const raw = String(codInterno).trim()
  const m = raw.match(/^(\d+)[A-Za-z]+$/)
  return m ? m[1] : raw
}
