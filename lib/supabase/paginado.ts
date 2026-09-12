/**
 * Paginación obligatoria para lecturas de Supabase.
 *
 * PostgREST devuelve **HTTP 200 con menos filas de las que hay** cuando la
 * consulta pasa el tope de 1000 (`db_max_rows`), sin señalar el truncamiento:
 * no hay error, no hay warning, y pedir `limit 2000` devuelve 1000 igual.
 * El síntoma de este bug es que no hay síntoma.
 *
 * Portado de `flowstica-deposito/lib/supabase/paginado.ts`, que es el patrón
 * canónico de la casa. Se copia en vez de importarse porque son dos repos
 * distintos sin paquete compartido; si se arregla algo acá, mirar allá también.
 *
 * POR QUÉ EXISTE ACÁ (medido contra prod el 12-sep-2026):
 *   `gl_lista_precios` tiene 1024 filas y **ya estaba truncando**:
 *     - `api/configuracion/cadenas` la leía entera para derivar la lista de
 *       cadenas — se comía 24 filas en cada request;
 *     - `api/posicionamiento` devolvía 954 filas con todas las cadenas
 *       seleccionadas, a 46 del tope.
 *   `pm_monitoring` (activos 638 / 906 totales) la escribe el Price Monitor,
 *   otro proyecto: crece sin que nadie de este repo se entere.
 *
 * La regla que hace correcto al bucle: **un lote LLENO nunca prueba que era el
 * último.** Sólo un lote incompleto lo prueba. Por eso se pide exactamente el
 * tope y se corta con `lote.length < TOPE_POSTGREST`, nunca con un `count`
 * calculado antes ni con una sola vuelta.
 *
 * Ojo con el `order`: paginar con `range` sobre una consulta sin orden estable
 * puede repetir o saltear filas entre vueltas, porque nada obliga a Postgres a
 * devolver el mismo orden en dos requests distintos. La consulta que se pasa
 * acá tiene que traer su propio `.order(...)` sobre una columna **única**
 * (la PK), no sobre una con empates.
 */

/** Tope duro de PostgREST (`db_max_rows`). Pedir más NO trae más. */
export const TOPE_POSTGREST = 1000

/**
 * Techo de vueltas por defecto: 20 × 1000 = 20.000 filas.
 *
 * Es un backstop contra un bucle infinito (una consulta que devolviera siempre
 * lotes llenos), no un límite de negocio. Si alguna llamada lo toca de verdad,
 * el problema no es el techo: es que esa agregación tiene que mudarse a una
 * vista. Por eso tocarlo se hace explícito en el call site.
 */
const MAX_VUELTAS_DEFAULT = 20

export interface OpcionesPaginado {
  /** Techo de iteraciones. Default 20 (= 20.000 filas). */
  maxVueltas?: number
  /**
   * `true` = una lista incompleta hace `throw` en vez de loguear.
   *
   * Va para los llamadores donde "faltan filas" no es una pantalla con huecos
   * sino una DECISIÓN MAL TOMADA. Default `false`: la semántica histórica de
   * estas pantallas es "sin datos → lista vacía", y hacer throw por default
   * volvería 500 páginas que hoy renderizan vacías.
   */
  estricto?: boolean
}

/**
 * Trae TODAS las filas de una consulta, de a 1000.
 *
 * @param consulta Recibe `(desde, hasta)` y devuelve la query ya construida
 *   con su `.range(desde, hasta)` y su `.order(...)` sobre una columna única.
 * @param opciones Ver `OpcionesPaginado`.
 *
 * Sin `estricto`, el error de la consulta y el techo agotado se reportan por
 * `console.error` y devuelven lo que se haya juntado. Quedarse callado es
 * exactamente el bug que este módulo existe para evitar, así que como mínimo
 * queda en el log del servidor.
 */
export async function traerTodo<T>(
  consulta: (
    desde: number,
    hasta: number
  ) => PromiseLike<{ data: unknown; error?: unknown }>,
  opciones: OpcionesPaginado = {}
): Promise<T[]> {
  const { maxVueltas = MAX_VUELTAS_DEFAULT, estricto = false } = opciones

  const filas: T[] = []

  for (let vuelta = 0; vuelta < maxVueltas; vuelta++) {
    const desde = vuelta * TOPE_POSTGREST
    const { data, error } = await consulta(desde, desde + TOPE_POSTGREST - 1)

    if (error) {
      const msg =
        `[paginado] la consulta falló en la vuelta ${vuelta} (filas ${desde}+); ` +
        `hay ${filas.length} filas parciales.`
      if (estricto) throw new Error(msg, { cause: error })
      console.error(msg, error)
      return filas
    }

    const lote = (data as T[] | null) ?? []
    filas.push(...lote)

    // Lote incompleto = no hay más. Es la ÚNICA condición de corte válida.
    if (lote.length < TOPE_POSTGREST) return filas
  }

  const msg =
    `[paginado] se agotaron las ${maxVueltas} vueltas con ${filas.length} filas ` +
    `y el último lote vino lleno: puede haber más sin traer. ` +
    `Subí maxVueltas en el call site o mudá la agregación a una vista.`
  if (estricto) throw new Error(msg)
  console.error(msg)
  return filas
}
