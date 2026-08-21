-- 21-ago-2026 — APLICADA en produccion (avanti-comercial / lnldlsslkorjilmiumrj)
--
-- HALLAZGO: las 28 tablas gl_* tenian los 7 privilegios otorgados a anon y
-- authenticated por los default privileges de Supabase, incluido TRUNCATE.
-- TRUNCATE no pasa por RLS: es una operacion de tabla completa que ignora
-- cualquier policy, incluidas las de tenant via get_user_tenant_id().
--
-- ALCANCE MEDIDO del agujero (no era solo gl_skus):
--   * las 28 tablas gl_*, no una;
--   * `TRUNCATE gl_skus CASCADE` alcanzaba 8 tablas por FK, y dos de ellas
--     (pm_productos, pm_alertas) y mp_suscripciones son de OTROS proyectos
--     de la misma base: el agujero del Gestor arrastraba al Price Monitor;
--   * las 10 tablas _bak_* tienen RLS con 0 policies — protegidas contra
--     lectura, NO contra TRUNCATE: eran los backups, truncables sin poder leerlos.
--
-- CALIBRACION: anon y authenticated son NOLOGIN y PostgREST no expone ningun
-- verbo TRUNCATE, y no existe RPC con SQL dinamico alcanzable por esos roles
-- (verificado sobre pg_proc). El privilegio estaba otorgado pero sin vector de
-- emision por la Data API: riesgo LATENTE, que se vuelve explotable el dia que
-- alguien agregue una RPC SECURITY INVOKER con EXECUTE dinamico.
--
-- FORMA DEL FIX: REVOKE ALL (lista blanca) y re-GRANT solo el DML que la app usa,
-- en vez de enumerar los privilegios a sacar. Estado final = estado previo MENOS
-- {TRUNCATE, REFERENCES, TRIGGER}. El camino feliz del cliente no cambia.
--
-- CONSUMIDORES VERIFICADOS ANTES DE APLICAR (que hace cada uno si esto falla):
--   * gestor-listas: browser y SSR usan la anon key; los 4 DML siguen otorgados.
--   * ETL de ai-platform (ingest_scanntech, price_monitor): usan service_role.
--   * motor_notas_reader: tiene grant DIRECTO de SELECT sobre gl_skus y
--     gl_lista_precios — no colgaba de PUBLIC, el revoke no lo toca.
--   * tablas _bak_*: sin consumidores (grep en gestor-listas y en ai-platform),
--     por eso van sin re-grant.
--
-- VERIFICACION POST (contando, no mirando la lista):
--   anon = authenticated = 72 privilegios = 18 tablas operativas x 4 DML;
--   TRUNCATE/REFERENCES/TRIGGER = 0 en las 28;
--   REST con anon key: gl_skus -> 200 [] (igual que antes);
--   REST con anon key: gl_skus_bak_a21 -> 42501 (el revoke tomo efecto).
--
-- DEUDA ABIERTA (fuera del alcance de este change-set): el mismo patron alcanza
-- a 109 de las 153 tablas NO gl_ de esta base (mp_*, pm_*, fc_*, etc.).

do $$
declare
  t record;
  n_total int := 0;
  n_bak   int := 0;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'gl\_%'
    order by c.relname
  loop
    execute format('revoke all on public.%I from anon, authenticated, public', t.relname);

    if t.relname like '%\_bak\_%' then
      n_bak := n_bak + 1;
    else
      execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t.relname);
    end if;

    n_total := n_total + 1;
  end loop;

  if n_total <> 28 then
    raise exception 'Esperaba 28 tablas gl_*, encontre %. Abortado.', n_total;
  end if;

  raise notice 'gl_* procesadas: % (de las cuales _bak_ sin re-grant: %)', n_total, n_bak;
end $$;

notify pgrst, 'reload schema';

-- ROLLBACK (si algo del Gestor dependiera de TRUNCATE via anon/authenticated):
--   grant truncate on public.gl_skus to anon, authenticated;
