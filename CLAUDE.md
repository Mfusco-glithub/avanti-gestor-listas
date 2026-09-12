# CLAUDE.md — gestor-listas

Reglas comunes (git, secretos, migraciones, trampas del stack, IA) están en
`D:\Flowstica\CLAUDE.md` y se cargan solas. Acá va solo lo de este repo.

## Qué es este repo

App web para el equipo comercial de **Avanti Uruguay**: administra las listas de
precios que se le envían a cada cadena de supermercados uruguaya (Disco/Devoto/
Geant, TATA, Tienda Inglesa, MACRO, PedidosYa, distribución interior, comercio).
El ciclo es: se **importa** el Excel de la lista vigente → se **simula** un
aumento contra precios de competencia → se **verifica** margen por cadena →
se **genera** el Excel con el formato exacto que exige cada cadena.
Deploy en Vercel (proyecto `avanti-gestor-listas`, Node 20.x), base Supabase
`avanti-comercial` (ref `lnldlsslkorjilmiumrj`), tablas con prefijo `gl_`.

## Qué NO es

- **No es multi-tenant en los hechos.** Las tablas llevan `tenant_id` y RLS,
  pero cada route hardcodea `const TENANT_ID = '00000000-0000-0000-0000-000000000001'`
  y casi todas escriben con `createAdminClient()` (service key), que **saltea
  RLS**. El aislamiento real hoy es esa constante en el código, no la base.
- **No es dueño de su base.** El proyecto Supabase es compartido con otros
  sistemas de ai-platform. El repo **lee** `pm_monitoring`, `pm_precios`,
  `pm_productos`, `vw_pm_ultimo_precio` y `vw_margen_cadena` (Price Monitor)
  pero no los crea ni los mantiene.
- **`supabase/migrations/` NO es el esquema.** Hay 3 archivos; el primero crea
  10 tablas y en producción hay 28 `gl_*`. Tablas centrales del flujo actual
  (`gl_lista_precios`, `gl_simulaciones`, `gl_simulacion_items`,
  `gl_descuento_cadena`, `gl_marca_segmento`, `gl_ref_precios_comercio`) se
  crearon fuera del repo. La referencia de esquema usable es
  `types/database.ts` (generado) y la base misma.
- **No calcula el precio de INTERIOR.** Las filas INTERIOR llegan precomputadas
  a `gl_lista_precios` desde un paso externo; no hay código de divisor por hoja
  (`docs/DATA-FIXES.md`). El único `/1.25` del repo es cosmético, en el header
  de `lib/generadores/xlsx-interior.ts:5`.
- **`README.md` es el de `create-next-app`** — no describe nada del proyecto.
  El setup real está en `SETUP.md` (ojo: sus conteos de seed son de mayo-2026 y
  ya no cuadran — dice 362 SKUs, hoy hay 305).

## Stack

Next.js 15.5.20 (App Router) · React 19 · TypeScript 5 (`strict: false`,
`noImplicitAny: false`) · Tailwind 3.4.17 + Radix UI + lucide-react ·
`@supabase/supabase-js` ^2.49 + `@supabase/ssr` ^0.5 · `exceljs` ^4.4 (genera
los Excel de salida) · `xlsx` 0.20.3 **desde el CDN de SheetJS**, no npm
(`https://cdn.sheetjs.com/xlsx-0.20.3/...tgz`, lee los Excel de entrada) ·
`resend` ^4 (mails) · zod + react-hook-form.

## Invariantes

1. **`precio_iva` nunca se saca del PVP.** Es la columna "PRECIO FACT IVA" del
   Excel; si la cadena no la trae (MACRO, Tienda), se calcula `neto×(1+iva_rate)`
   y se emite un warning. Confundirla con el PVP fue un bug sistemático — por eso
   el parser existe (`lib/importacion/parse-lista-xls.ts`).
2. **Las columnas del Excel se detectan por nombre de header, nunca por índice.**
   Hay 5 formatos distintos (A–E) y la cabecera se repite dentro de cada hoja.
   Caso más traicionero: en TIENDA INGLESA `precio_neto` es **"COSTO BASE S/IMP"**,
   no "PRECIOS SIN IMP" (`parse-lista-xls.ts:19`).
3. **Todo código interno que sale del sistema pasa por `codigoExportacion()`**
   (`lib/generadores/codigo-exportacion.ts`). El sufijo de letra (`214E`, `71E`)
   existe solo dentro de `gl_skus` para evitar colisiones; el sistema externo
   espera el número pelado.
4. **El código de cadena se valida contra un set cerrado antes de escribir**
   (`CADENAS_VALIDAS` en `app/api/importacion/lista/route.ts:11`, espejado por
   `CADENA_IDS` en `app/api/listas/generar/route.ts:17`). Si agregás una cadena,
   tocás **los dos**: el segundo mapea el string de `gl_lista_precios.cadena` al
   UUID de `gl_cadenas`.
5. **Una simulación `ejecutada` no se re-ejecuta.** `ejecutar` escribe precios
   reales en `gl_lista_precios` y es lo que corta la reentrada
   (`app/api/simulaciones/[id]/ejecutar/route.ts:22`). Orden:
   `borrador → ejecutada → verificada`. Generar listas exige
   `estado in ('ejecutada','verificada')`.
6. **`detectSessionInUrl: false` en `lib/supabase/client.ts` no se toca.** Con
   `true`, gotrue-js procesa el hash en paralelo, toma el lock y el `setSession()`
   manual de `/auth/callback` y `/auth/reset-password` se cuelga.
7. **`/auth/*` va sin caché y exento del gate de sesión.** `Cache-Control:
   no-store` en `next.config.js` + el early-return de `middleware.ts:34`. Esas
   páginas reciben los tokens en el hash y todavía no tienen cookie.
8. **Los grants a `anon`/`authenticated` son lista blanca.** La migración
   `20260821000001` revoca todo y re-otorga solo `SELECT/INSERT/UPDATE/DELETE`.
   `TRUNCATE` **no pasa por RLS** y estaba otorgado por los default privileges
   de Supabase. Cualquier tabla `gl_*` nueva nace con ese agujero: hay que
   revocar explícitamente.

## Estructura

```
app/(app)/          páginas con sesión: dashboard, listas, simulador,
                    simulador-comercio, verificacion, posicionamiento,
                    actualizaciones, configuracion/{cadenas,skus,marcas,grupos}
app/(auth)/login/   login con password
app/auth/           callback (auto-login desde Gerencia) y reset-password;
                    client-side, leen tokens del hash
app/api/            toda la lógica de servidor (24 routes)
components/         ui/ (Radix), layout/Sidebar.tsx, actualizaciones/, posicionamiento/
lib/generadores/    un archivo por formato de Excel de salida (exceljs)
lib/importacion/    parse-lista-xls.ts — parser multi-hoja, multi-formato
lib/supabase/       client.ts (browser) y server.ts (SSR + createAdminClient)
lib/email/          plantilla + envío por Resend
supabase/migrations/ solo 3 migraciones — ver "Qué NO es"
types/database.ts   tipos generados de la base (~88 KB)
docs/               DEVLOG.md (bugs y decisiones) y DATA-FIXES.md (fixes de datos prod)
```

## Trampas

- **`typescript.ignoreBuildErrors: true`** en `next.config.js:7`. El build **no
  valida tipos**: un error tuyo no aparece hasta runtime. El motivo real es el
  choque de versiones entre `@supabase/ssr` y `postgrest-js`, parcheado además
  con `Omit<Database, '__InternalSupabase'>` en ambos clientes Supabase y con
  `as any` salpicado en las routes. No lo saques sin resolver el choque primero.
- **La rama `actualizaciones/*` es código muerto.** Es el wizard original y
  quedó fuera del flujo actual. Es el único consumidor de
  `lib/calculadora-precios.ts` (`redondearPVP`, semáforo de margen), de
  `xlsx-generico/gdu/kinko`, de `/api/archivos/generar` y de las tablas
  `gl_actualizaciones`, `gl_archivos`, `gl_envios`. **No lo tomes como
  referencia ni lo mantengas**: el camino vivo es importación → simulador →
  verificación → listas. Sigue linkeado en el Sidebar, que es lo único que lo
  mantiene alcanzable.
- **`gl_lista_precios` ya pasó el tope de 1000 de PostgREST** (1024 filas al
  12-sep-2026), que trunca con HTTP 200 y sin warning. Usá `traerTodo()` de
  `lib/supabase/paginado.ts` para toda lectura de una tabla que pueda crecer,
  con `.order()` sobre una columna **única** (la PK): sin orden estable la
  paginación misma repite o saltea filas. **La mayoría de las consultas del repo
  todavía no paginan** — al tocar cualquiera, revisá si le corresponde.
  `gl_skus` está holgada (289 activos de 305), así que el cargador de la
  importación, que la levanta entera, no corre riesgo todavía.
  Un lote lleno nunca prueba que era el último.
- **La agregación pesada va en la base, no en JS.** El máximo anti-promo de
  `/posicionamiento` salía de traer ~40.000 filas de `pm_precios` y reducirlas en
  un bucle; PostgREST devolvía 1000. Lo que se degradaba era **la exactitud de
  cada máximo, no la cobertura**: llegaban 602 de los 638 monitores, pero con
  1,66 filas de historia cada uno en vez de ~64. Un max sobre 2 muestras solo
  puede quedar por debajo del real, así que la competencia se veía más barata de
  lo que estuvo. Paginar no alcanzaba (40 vueltas, arriba del techo de
  `traerTodo()`). Hoy lo resuelve la RPC `pm_precio_max_por_monitor`.
- **Para medir qué devuelve PostgREST, preguntale a PostgREST.** La misma
  consulta con `LIMIT 1000` en el editor SQL de Supabase devuelve **19**
  monitores distintos; por la API son **602**. El plan es otro. Un `curl` con
  `Prefer: count=exact` y el `Content-Range` de la respuesta (`0-999/39978`) es
  la medición válida; un SQL que se le parece, no.
- **`pm_precios` y `pm_monitoring` son VISTAS, no tablas** (las tablas base son
  `mp_listings` y `mp_canales`, del Price Monitor). `pg_indexes` sobre una vista
  devuelve vacío **siempre**: ese vacío no significa "tabla sin indexar".
- **La anon key queda horneada en el bundle en build time.** Está literal en 5
  chunks de `.next/static/chunks/` (entre ellos `(app)/layout`, `login` y
  `auth/callback`). Cambiar la variable en Vercel **no alcanza**: el JS ya
  compilado sigue mandando la clave vieja. Hay que redeployar con **"Use
  existing Build Cache" DESTILDADO**. (La service key no se filtra al bundle:
  solo la lee `lib/supabase/server.ts` y ningún `'use client'` importa ese
  módulo.)
- **El repo de GitHub es público** (`Mfusco-glithub/avanti-gestor-listas`).
  Todo lo que se commitee acá es legible por cualquiera.
- **`app/api/tmp-monitor/route.ts` escribe un archivo con `fs.writeFileSync` a
  una ruta absoluta de Windows** (`D:\Flowstica\...\monitor_table.txt`). Es un
  script de diagnóstico disfrazado de route: revienta en Vercel. No es referencia
  de nada.
- **En el callback, `window.location.replace()` es deliberado.** `router.replace`
  del App Router se colgaba después de un `history.replaceState` manual (DEVLOG
  14-jul-2026). No lo "modernices" de vuelta a navegación client-side.
- **`lib/generadores/xlsx-disco.ts` pesa 72 KB** casi todo logos en base64
  (líneas 42-43). No lo abras entero para buscar lógica.
- **La historia de git empieza el 6-jul-2026** aunque el código es de mayo. No
  busques el porqué de nada anterior a esa fecha en los commits.

## Cómo se corre y se testea

```bash
npm install
cp .env.example .env.local   # completar con valores reales (ver SETUP.md)
npm run dev                  # http://localhost:3000
npm run build
npm run lint                 # eslint flat config; el build NO chequea tipos
npx tsc --noEmit             # única forma de ver los errores de tipos
```

No hay suite de tests: la verificación es manual, por la pantalla
`/verificacion` y por el `dry_run=true` de `/api/importacion/lista`, que parsea
y devuelve preview sin escribir. **Usalo siempre antes de importar.**

La importación **no tiene UI**: se dispara por POST multipart a
`/api/importacion/lista` con `file`, `vigencia` (YYYY-MM-DD), `cadenas` (CSV) y
`dry_run`.

## Estado actual

- **Funcionando en producción** (Vercel): importación de listas, simulador retail,
  simulador comercio, verificación por cadena, generación de Excel para los 8
  formatos de `/api/listas/generar`, posicionamiento y ABMs de configuración.
- **21-ago-2026** — cerrado el agujero de `TRUNCATE` en las 28 tablas `gl_*`
  (último commit). Queda **deuda abierta y declarada** en la migración: el mismo
  patrón alcanza a 109 de las 153 tablas no-`gl_` de esa base.
- **14-jul-2026** — cerrada la saga del auto-login Gerencia→Gestor.
- **12-sep-2026** — arreglado el truncamiento de PostgREST: helper `traerTodo()`,
  paginados `configuracion/cadenas` y `posicionamiento`, y el máximo anti-promo
  movido a la RPC `pm_precio_max_por_monitor` (migración `20260912000001`,
  aplicada). Borrado `postcss.config.mjs`.
- **Pendientes acordados, listos para ejecutar:**
  - sacar los `console.log('[CB] …')` de `app/auth/callback/page.tsx` (se dejaron
    ~1 semana para confirmar estabilidad; el plazo venció en julio);
  - borrar la rama muerta `actualizaciones/*` con sus dependencias exclusivas.
- **Deudas anotadas, sin decidir:**
  - **regenerar `types/database.ts`.** La llamada a la RPC en
    `posicionamiento/route.ts` va como `(supabase as any).rpc` con
    `eslint-disable` porque los tipos generados no conocen la función. Eso apaga
    el chequeo justo en la llamada nueva: si mañana cambia la firma, el código
    no se queja. No es un problema de estilo.
  - **18 errores de tipos preexistentes** en `posicionamiento/route.ts` (270 en
    todo el repo), ocultos por `ignoreBuildErrors`. No los introdujo ningún
    cambio reciente; queda decidir aparte si se limpian.
- **A medias:** adjuntar el Excel al mail de Resend; migraciones del repo
  desincronizadas del esquema real.
