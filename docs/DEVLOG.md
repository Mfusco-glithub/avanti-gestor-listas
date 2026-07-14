# DEVLOG — Gestor de Listas

Registro cronológico de bugs, decisiones y fixes no obvios. Entradas nuevas arriba.

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
