# Correcciones de datos (producción — Supabase `avanti-comercial`)

Registro de cambios a datos que no quedan capturados en el código.

## 2026-07-06 — Códigos internos de importación + verificación divisor INTERIOR

### Bug 2 — Códigos internos viejos en el archivo de importación (CORREGIDO)

**Causa raíz:** el generador de importación (`/api/listas/generar`,
`/api/simulador-comercio/generar`) toma el código de `gl_skus.cod_interno`,
que tenía los códigos viejos. `gl_lista_precios.cod_interno` (columna
denormalizada) tenía los nuevos pero de forma inconsistente, y además la
importación **no la lee**. Se corrige el dato en la raíz (`gl_skus`).

**`gl_skus.cod_interno` (5 filas):**

| EAN | viejo | correcto | Producto |
|-----|-------|----------|----------|
| 7730927023693 | 364 | 2202  | Ravioles Cong. 4 Quesos AVANTI 750 g |
| 7730927023679 | 365 | 2200  | Ravioles Cong. Verdura AVANTI 750 g |
| 7730927022306 | 746 | 76361 | Ravioles J&Q PASTAMANÍA Cong. 500 g |
| 7730927022337 | 748 | 76363 | Sorrentinos J&Q PASTAMANÍA Cong. 500 g |
| 7730927022290 | 749 | 76364 | Ñoquis c/Papa PASTAMANÍA Cong. 500 g |

Sin colisión con el `UNIQUE(tenant_id, cod_interno)` (ningún otro SKU usaba esos códigos).

**`gl_lista_precios.cod_interno` (limpieza de la columna denormalizada):** se
unificaron todas las filas de esos 5 EAN al código correcto. Se corrigieron 14
filas del 4 Quesos (valores `null`, typo `2002`, viejo `364`) y 11 del Verdura
(`null`, viejo `365`). Los 3 PASTAMANÍA ya estaban consistentes.

**Verificación end-to-end:** el generador real de importación emite ahora
`2202/2200/76361/76363/76364`, ningún código viejo, y `precio venta` con IVA
incluido (neto×1.10; tipo IVA = 2 / mínima, iva_rate 0.10).

### Bug 1 — Divisor INTERIOR de PASTAMANÍA masas (VERIFICADO, sin cambios)

Reporte: masas PASTAMANÍA calculadas con 1.30 en vez de 1.25. **No se
reprodujo.** En `gl_lista_precios` (vigencia 2026-07-06) todos los divisores
COMERCIO/INTERIOR ya son correctos:

- PASTAMANÍA Masas → 1.25 ✅
- PASTAMANÍA Pastas Frescas → 1.25 ✅
- PASTAMANÍA / AVANTI Congelados → 1.30 ✅

Además, la app **no computa el divisor**: las filas INTERIOR llegan
precomputadas a `gl_lista_precios` desde un paso externo (no hay código de
divisor por hoja/categoría que corregir). Sin cambios.
