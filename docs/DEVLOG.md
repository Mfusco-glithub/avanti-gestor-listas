# DEVLOG — Gestor de Listas

Registro cronológico de bugs, decisiones y fixes no obvios. Entradas nuevas arriba.

## 2026-09-12 — El "19 de 626" era un artefacto del editor SQL, no producción

Al justificar el fix del anti-promo afirmé que el tablero "se calculaba sobre
**19 monitores de 626**". **El número existe pero no describe producción**, y
quedó escrito en la migración `20260912000001`, el `CLAUDE.md` y varios mensajes
de commit (esos no se tocan).

### Cómo se cayó

Marcelo midió el tablero real antes del deploy: **306 grupos**. Como los
productos sin `grupo_comparable` entran uno por fila (`route.ts:270`, clave
`sin_<producto_id>`) y un monitor ausente del mapa de máximos no aporta ninguna
fila (`productosConPrecio` itera ese mapa, `route.ts:103`), 306 filas exigen
cientos de monitores. Con 19 no se llega. Simulado en SQL, el código viejo
habría mostrado **13 grupos**, no 306.

Dos números medidos, incompatibles. Uno estaba mal.

### La medición que lo resolvió

Contra la **API real** (PostgREST con la anon key, misma forma que el route:
`select` + `IN` de los 638 monitores activos + `fecha` + `precio not null`):

| | |
|---|---|
| `Content-Range` | `0-999/39978` — HTTP 206, tope 1000 confirmado |
| monitores distintos en las 1000 filas | **602** de 638 activos |
| filas por monitor | **1,66**, contra ~64 disponibles |

**El "19" salía del editor SQL de Supabase**, corriendo la misma consulta con
`LIMIT 1000`. Plan distinto: el editor barre las tablas base en orden físico y
las filas salen agrupadas por monitor; PostgREST no. Medí con una herramienta
que se parecía a la del app pero no era la del app — dos veces, incluida la
"remedición" que hice justamente para verificar.

### Qué degradaba el truncamiento, entonces

**La exactitud de cada máximo, no la cobertura.** Llegaban casi todos los
monitores, pero con ~2 precios de historia cada uno en vez de ~64. Un máximo
sobre 2 muestras solo puede quedar **por debajo** del real, nunca por encima: el
tablero mostraba a la competencia **más barata de lo que estuvo**. Y sin
`ORDER BY`, el mismo request podía dar números distintos.

Eso explica los 306 grupos sin contradicción: 602 monitores cubren casi todos
los productos, así que las filas estaban; lo que estaba mal era el número dentro
de cada una.

### La lección

**Para medir qué devuelve una API, preguntale a la API.** Un SQL equivalente no
es equivalente: el plan lo elige el motor, no la semántica. Acá la forma válida
era un `curl` con `Prefer: count=exact` leyendo el `Content-Range`.

Es la misma familia que el `pg_indexes` vacío sobre `pm_precios` — que es una
vista — de más temprano hoy: **un resultado que sale de la herramienta
equivocada no es una medición, y se siente igual que una.**

## 2026-09-12 — Relevamiento de claves Supabase y procedimiento de migración

**Disparador:** aparecieron claves de Supabase commiteadas en **otro** repo y se
evaluó rotar las del proyecto `avanti-comercial`. Este repo lee `pm_precios` con
la anon, así que había que saber qué se rompía.

### Corrección al plan inicial: la rotación de claves legacy ya no existe

El plan era "rotar anon y service_role". **No se puede.** La doc de Supabase dice
textual que *"it is no longer possible to rotate the legacy anon, service and JWT
secrets"*. El camino es migrar a las claves nuevas:

- `anon` → **publishable** (`sb_publishable_…`)
- `service_role` → **secret** (`sb_secret_…`)

**Y esto cambia el riesgo para mejor:** los dos sistemas **conviven**. Crear las
claves nuevas no revoca las legacy, así que se migra cliente por cliente y recién
al final se desactivan las viejas (desactivación **reversible**, desde
Settings → API Keys). **No hay ventana de caída forzada**: el Gestor no se cae
mientras no se desactiven las legacy. Las legacy quedan deprecadas a fin de 2026.

Bonus del esquema nuevo: las secret keys devuelven **HTTP 401 si se usan desde un
browser**, o sea que una fuga al frontend falla cerrado en vez de dar acceso.

### Qué consume este repo (relevamiento completo)

Cuatro variables, en cuatro archivos. Nada más lee `process.env` en el repo.

| Variable | Dónde | Rol |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `client.ts:8`, `server.ts:12` y `:41`, `middleware.ts:8` | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `client.ts:9`, `server.ts:13`, `middleware.ts:9` | anon |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts:42` | service_role |
| `RESEND_API_KEY` | `lib/email/index.ts:3` | ajeno a Supabase |

**El alcance de la service_role es mayor de lo que se suponía:** no es solo el
tablero de posicionamiento. **17 de las 24 rutas de API escriben con
`createAdminClient()`** — configuración, importación, simuladores, verificación,
generación de listas y envío de mails. Si la secret key queda mal, no se degrada
una pantalla: falla toda escritura.

Verificado que la service key **no se filtra al browser**: solo la lee
`lib/supabase/server.ts`, ningún `'use client'` importa ese módulo y no aparece en
`.next/static/`.

Verificado también que **este repo está limpio**: cero JWTs (`eyJhbGciOi…`) en
todo el historial, `.env.local` nunca commiteado, `.env.example` solo con
placeholders. Importa porque el repo de GitHub es **público**.

### Procedimiento de migración para este repo

El orden importa: las claves nuevas primero, las legacy se desactivan al final.

1. Crear publishable y secret en Supabase → Settings → API Keys → pestaña
   "Publishable and secret API keys". No revoca nada de lo existente.
2. En Vercel → Settings → Environment Variables (production), reemplazar los
   **valores**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← publishable,
   `SUPABASE_SERVICE_ROLE_KEY` ← secret. **Los nombres de las variables quedan
   igual**: renombrarlos obliga a tocar los 4 archivos de arriba. Costo: los
   nombres pasan a mentir (una variable llamada `…ANON_KEY` con una publishable
   adentro). Si algún día se renombra, es un cambio de código, no de config.
3. **Redeploy sin caché de build.** La anon/publishable se hornea en el bundle en
   build time (está literal en 5 chunks de `.next/static/chunks/`), así que
   cambiar la env var no alcanza. Deployments → el último → Redeploy con **"Use
   existing Build Cache" DESTILDADO**. No hace falta commit nuevo; el proyecto
   igual deploya solo con cada push a `main`.
4. Actualizar el `.env.local` propio con las mismas dos claves, o el dev local
   queda roto.
5. Humo, en este orden: login → `/posicionamiento` (lectura publishable) →
   editar una cadena en Configuración (escritura secret). Si el login anda pero
   guardar falla, es la secret key.
6. Recién con eso verde, desactivar las legacy en el Dashboard. Es reversible:
   si aparece un consumidor olvidado, se reactivan.

**Ojo con el paso 6:** la base `avanti-comercial` es compartida (Price Monitor,
ETL de ai-platform, `motor_notas_reader`). Desactivar las legacy los alcanza a
todos, no solo al Gestor. Ese inventario no se hizo acá.

### Suelto, para no perderlo

Varios deploys viejos de este mismo proyecto de Vercel vienen del repo
**`avanti-automation`** (privado), desde `/projects/avanti/app/gestor-listas`:
este código vivió ahí antes. Pista sobre dónde pudieron filtrarse las claves —
no verificada, no se miró ese repo.

## 2026-07-14 — Auto-login Gerencia→Gestor: popup colgado en "Iniciando sesión…"

**Síntoma:** al abrir el Gestor desde el botón "Abrir Gestor de Listas" de Gerencia,
el popup navegaba a `/auth/callback#access_token=…&refresh_token=…`, mostraba
"Iniciando sesión…" y quedaba **colgado indefinidamente** con la URL ya **limpia**
(sin hash).

**Causa:** en `app/auth/callback/page.tsx`, tras un `setSession()` exitoso, `entrar()`
hacía `window.history.replaceState(...)` (para limpiar el hash) y **acto seguido**
`router.replace('/dashboard')` + `router.refresh()`. El `replaceState` manual
**desincronizaba el estado interno del App Router de Next**, y la navegación
client-side (`router.replace`) **nunca completaba** — el popup quedaba montado en el
callback. Cargar `/dashboard` a mano por URL con la misma sesión funcionaba perfecto
→ el destino estaba sano; el cuelgue era exclusivo de la navegación client-side.

**Evidencia (logs `[CB]` temporales en prod):** hash llegaba (`hash_len=840`), tokens
parseaban, `[CB]3 setSession → OK`, `[CB]4` disparaba, pero
`[CB]4.5 (a 3s) → pathname = /auth/callback` → confirmado que `router.replace` no
completaba.

**Fix (commit `6255665`):** en `entrar()`, reemplazar `replaceState` + `router.replace`
+ `router.refresh()` por una **navegación completa del navegador**:
`window.location.replace('/dashboard')`. Determinística, sin depender del client
router. `.replace` (no `.assign`) → `/auth/callback#tokens` no queda en el historial
del popup (los tokens no son recuperables con Atrás). El `replaceState` para limpiar
la URL ya no hace falta: la navegación full descarta el hash sola.

**Contexto relacionado (misma saga, ya en prod):** `detectSessionInUrl:false` en
`lib/supabase/client.ts` (deadlock del `setSession` con el auto-procesamiento del hash)
y `Cache-Control: no-store` en `/auth/*` (el browser servía una versión vieja del
callback desde caché).

**Nota:** los logs `[CB]1-4` quedan ~1 semana hasta confirmar estabilidad; después se
sacan.
