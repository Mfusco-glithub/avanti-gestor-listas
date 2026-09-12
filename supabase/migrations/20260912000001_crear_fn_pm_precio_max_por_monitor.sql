-- 12-sep-2026 — NO APLICADA. La aplica Marcelo a mano.
--
-- HALLAZGO: app/api/posicionamiento/route.ts:74 lee pm_precios con
--   .in('monitor_id', todosMonitorIds).gte('fecha', desde).not('precio','is',null)
-- y calcula en JavaScript el maximo por monitor. Esa consulta devuelve 34.132
-- filas para la ventana de 8 semanas, contra el tope de 1000 de PostgREST, con
-- HTTP 200 y sin warning. El precio maximo por monitor es la base anti-promo de
-- TODO el tablero de posicionamiento.
--
-- MEDIDO EL 12-SEP-2026, y es peor que "faltaban filas": como las filas vienen
-- agrupadas por monitor, esas 1000 alcanzaban solo 19 MONITORES de los 626 que
-- tienen precios en la ventana. El tablero se estaba calculando sobre el 3% de
-- los monitores, no sobre el 3% de un promedio parejo. Y sin ORDER BY, cuales
-- 19 no era determinístico: podia cambiar entre dos requests seguidos.
--
-- POR QUE NO ALCANZA CON PAGINAR: 34.132 filas son 35 vueltas de 1000, por
-- encima del techo de 20 de traerTodo() (lib/supabase/paginado.ts). Y el fondo
-- del asunto es que traer 34k filas al servidor de Node para quedarse con 626
-- maximos es la forma equivocada del problema: la agregacion va en la base.
--
-- POR QUE FUNCION Y NO VISTA: la ventana anti-promo es un parametro
-- (?semanas=, botones de 4/8/12 en la UI, arbitrario por query param). Una
-- vista no toma parametros; fijarla en 8 semanas romperia en silencio los
-- botones de 4 y 12. La funcion recibe el corte ya calculado, igual que hoy.
--
-- FORMA: aditiva pura. CREATE OR REPLACE de una funcion nueva. No toca
-- pm_precios ni ninguna tabla, no borra nada, no cambia ninguna policy. Si algo
-- sale mal, el route viejo sigue funcionando igual de mal que antes, no peor.
--
-- PARIDAD CON EL CALCULO ACTUAL (verificado sobre los datos del 12-sep-2026):
--   * precio es numeric, asi que max() y el parseFloat() del JS ordenan igual
--     (si fuera text, max() ordenaria lexicograficamente y '9' > '10');
--   * fecha es timestamptz y el corte se pasa ya resuelto desde el route, asi
--     que no hay diferencia entre el now() del server de Node y el de la base;
--   * el JS tiene una divergencia latente: usa `if (!max[mid] || precio > max[mid])`
--     y `!0` es true, asi que un precio 0 guardado seria pisado por CUALQUIER
--     precio posterior, aun menor. Hoy no se dispara (0 filas con precio = 0 o
--     negativo en las 68.408 de la tabla). max() no tiene ese problema.
--
-- SEGURIDAD: SECURITY INVOKER a proposito, NO definer. El route lee pm_precios
-- hoy con la anon key, o sea que ese acceso ya existe; la funcion no debe
-- escalarlo, solo mover la agregacion. Con invoker siguen aplicando las policies
-- de pm_precios tal cual. search_path fijo para que no lo secuestren.
--
-- GRANTS: las funciones nacen con EXECUTE para PUBLIC. Se revoca y se otorga
-- explicito, misma lista blanca que 20260821000001_revoke_truncate_gl_tables.sql.
--
-- DEUDA QUE NO CIERRA ESTE CHANGE-SET: pm_precios (68.408 filas) NO TIENE NINGUN
-- INDICE, ni siquiera PK. Esta funcion filtra por (monitor_id, fecha), asi que
-- hoy resuelve con un scan completo. Un indice en (monitor_id, fecha) seria
-- aditivo y la aceleraria mucho, pero pm_precios es del Price Monitor, no de
-- este repo: va en otra migracion y la decide ese proyecto. Ver abajo el EXPLAIN
-- para medirlo antes de decidir.

CREATE OR REPLACE FUNCTION public.pm_precio_max_por_monitor(
  p_monitor_ids integer[],
  p_desde       timestamptz
)
RETURNS TABLE (monitor_id integer, precio_max numeric)
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT p.monitor_id, max(p.precio) AS precio_max
  FROM public.pm_precios p
  WHERE p.monitor_id = ANY (p_monitor_ids)
    AND p.fecha >= p_desde
    AND p.precio IS NOT NULL
  GROUP BY p.monitor_id
$$;

COMMENT ON FUNCTION public.pm_precio_max_por_monitor(integer[], timestamptz) IS
  'Precio maximo por monitor desde una fecha (base anti-promo del tablero de '
  'posicionamiento). Reemplaza la agregacion en JS de posicionamiento/route.ts, '
  'que truncaba en 1000 filas de 34.132. Devuelve una fila por monitor.';

REVOKE ALL ON FUNCTION public.pm_precio_max_por_monitor(integer[], timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_precio_max_por_monitor(integer[], timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.pm_precio_max_por_monitor(integer[], timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_precio_max_por_monitor(integer[], timestamptz) TO service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACION POST-APLICACION (correr a mano; ninguna escribe nada)
-- ════════════════════════════════════════════════════════════════════════════
--
-- 1. La funcion existe, con la firma y el modo de seguridad esperados.
--    Esperado: 1 fila, security_type = 'INVOKER', provolatile = 's' (STABLE).
--
-- SELECT p.proname,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_type,
--        p.provolatile, p.proparallel, p.proconfig
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'pm_precio_max_por_monitor';
--
--
-- 2. Los grants quedaron como la lista blanca. Esperado: anon, authenticated y
--    service_role con EXECUTE; PUBLIC sin nada.
--
-- SELECT r.rolname, has_function_privilege(r.rolname,
--          'public.pm_precio_max_por_monitor(integer[], timestamptz)', 'EXECUTE') AS puede
-- FROM pg_roles r
-- WHERE r.rolname IN ('anon','authenticated','service_role')
-- ORDER BY r.rolname;
--
--
-- 3. PARIDAD — la funcion devuelve exactamente lo mismo que la agregacion
--    directa sobre la tabla, para la ventana de 8 semanas y los monitores
--    activos (que es lo que arma el route).
--    Esperado: 0 filas. Cualquier fila es una discrepancia.
--
-- WITH ids AS (
--   SELECT array_agg(monitor_id) AS v FROM pm_monitoring WHERE activo IS TRUE
-- ),
-- de_la_funcion AS (
--   SELECT * FROM ids, pm_precio_max_por_monitor(ids.v, now() - interval '8 weeks')
-- ),
-- de_la_tabla AS (
--   SELECT p.monitor_id, max(p.precio) AS precio_max
--   FROM pm_precios p
--   WHERE p.monitor_id IN (SELECT monitor_id FROM pm_monitoring WHERE activo IS TRUE)
--     AND p.fecha >= now() - interval '8 weeks'
--     AND p.precio IS NOT NULL
--   GROUP BY p.monitor_id
-- )
-- SELECT 'solo en la funcion' AS lado, monitor_id, precio_max FROM (
--   SELECT monitor_id, precio_max FROM de_la_funcion
--   EXCEPT SELECT monitor_id, precio_max FROM de_la_tabla) a
-- UNION ALL
-- SELECT 'solo en la tabla', monitor_id, precio_max FROM (
--   SELECT monitor_id, precio_max FROM de_la_tabla
--   EXCEPT SELECT monitor_id, precio_max FROM de_la_funcion) b;
--
--
-- 4. Lo mismo para las otras dos ventanas de la UI (4 y 12 semanas), que es lo
--    que una vista con la ventana fija no podria cubrir.
--    Esperado: en cada fila, filas_funcion = filas_tabla. No son cero: son la
--    cantidad de monitores con precios en esa ventana, y tienen que coincidir.
--
-- WITH ids AS (SELECT array_agg(monitor_id) AS v FROM pm_monitoring WHERE activo IS TRUE)
-- SELECT sem,
--        (SELECT count(*) FROM ids, pm_precio_max_por_monitor(ids.v, now() - (sem || ' weeks')::interval)) AS filas_funcion,
--        (SELECT count(DISTINCT p.monitor_id) FROM pm_precios p
--           WHERE p.monitor_id IN (SELECT monitor_id FROM pm_monitoring WHERE activo IS TRUE)
--             AND p.fecha >= now() - (sem || ' weeks')::interval
--             AND p.precio IS NOT NULL) AS filas_tabla
-- FROM (VALUES (4),(8),(12)) AS t(sem);
--
--
-- 5. CUANTO SE ESTABA PERDIENDO — cobertura de monitores con el truncamiento
--    viejo (1000 filas) contra la completa. Este es el numero que justifica el
--    cambio: no "faltaban filas", faltaban MONITORES enteros del tablero.
--    Al 12-sep-2026 la consulta completa son 34.132 filas.
--    ESPERADO (medido antes de aplicar): 19 y 626.
--
-- SELECT
--   (SELECT count(DISTINCT monitor_id) FROM (
--       SELECT monitor_id FROM pm_precios
--       WHERE monitor_id IN (SELECT monitor_id FROM pm_monitoring WHERE activo IS TRUE)
--         AND fecha >= now() - interval '8 weeks' AND precio IS NOT NULL
--       LIMIT 1000) t)                                   AS monitores_con_tope_1000,
--   (SELECT count(DISTINCT monitor_id) FROM pm_precios
--       WHERE monitor_id IN (SELECT monitor_id FROM pm_monitoring WHERE activo IS TRUE)
--         AND fecha >= now() - interval '8 weeks' AND precio IS NOT NULL) AS monitores_reales;
--
--
-- 6. El resultado entra holgado bajo el tope de PostgREST (una fila por monitor,
--    no una por precio). ESPERADO (medido antes de aplicar): 626, mas o menos
--    lo que haya cambiado el Price Monitor desde entonces.
--
-- SELECT count(*) AS filas_que_devuelve
-- FROM (SELECT array_agg(monitor_id) AS v FROM pm_monitoring WHERE activo IS TRUE) ids,
--      pm_precio_max_por_monitor(ids.v, now() - interval '8 weeks');
--
--
-- 7. Costo real, para decidir sobre el indice de la DEUDA de arriba. Si aparece
--    un Seq Scan de pm_precios, es el scan de 68.408 filas.
--
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM (SELECT array_agg(monitor_id) AS v FROM pm_monitoring WHERE activo IS TRUE) ids,
--               pm_precio_max_por_monitor(ids.v, now() - interval '8 weeks');
--
--
-- 8. Alcanzable por PostgREST con la anon key (que es como la va a llamar el
--    route). Desde la terminal, NO desde el SQL editor:
--
-- curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/pm_precio_max_por_monitor" \
--   -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--   -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{"p_monitor_ids":[1,2,3],"p_desde":"2026-07-01T00:00:00Z"}'
