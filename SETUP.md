# Avanti Gestor de Listas de Precios — Setup

## Pasos para ejecutar el proyecto

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear archivo de variables de entorno
Copiá `.env.example` a `.env.local` y completá con los valores reales:
```bash
cp .env.example .env.local
```

**Dónde encontrar los valores:**
- `NEXT_PUBLIC_SUPABASE_URL` → https://supabase.com/dashboard/project/lnldlsslkorjilmiumrj/settings/api
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → misma página, "anon public"  
- `SUPABASE_SERVICE_ROLE_KEY` → misma página, "service_role" (¡mantener secreto!)
- `RESEND_API_KEY` → crear cuenta en https://resend.com (gratis hasta 3.000 mails/mes)

### 3. Crear primer usuario admin
1. Ir al Dashboard de Supabase → Authentication → Users
2. Crear usuario con email y contraseña
3. Copiar el UUID del usuario
4. Ejecutar en el SQL Editor de Supabase:
```sql
INSERT INTO gl_usuarios (id, tenant_id, nombre, rol)
VALUES (
  '<UUID-DEL-USUARIO>',
  '00000000-0000-0000-0000-000000000001',
  'Tu Nombre',
  'admin'
);
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```
Abrir http://localhost:3000

### 5. Configurar cadenas
- Ir a Configuración → Cadenas
- Editar cada cadena para agregar emails de contacto
- Los códigos de Tienda Inglesa van en: Configuración → SKUs → Mapeos

## Estructura del proyecto
```
app/
  (auth)/login/          ← Página de login
  (app)/
    dashboard/           ← Panel principal
    posicionamiento/     ← Tablero de precios vs competencia
    actualizaciones/
      nueva/             ← Wizard 3 pasos
      [id]/              ← Detalle de actualización
    configuracion/
      cadenas/           ← ABM de cadenas
      skus/              ← Catálogo de productos
lib/
  supabase/              ← Cliente/servidor Supabase
  calculadora-precios.ts ← Lógica de negocio de precios
  generadores/           ← Excel por formato de cadena
  email/                 ← Envío de mails con Resend
types/database.ts        ← Tipos TypeScript de la BD
supabase/migrations/     ← SQL de referencia
```

## Deploy en Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard
# Settings → Environment Variables
```

## Tablas en Supabase
Las migraciones ya fueron aplicadas al proyecto `avanti-comercial`.
10 tablas `gl_` con RLS habilitado:
- gl_tenants, gl_usuarios
- gl_cadenas, gl_skus, gl_cadena_skus
- gl_reglas_posicionamiento
- gl_actualizaciones, gl_actualizacion_items
- gl_archivos, gl_envios

Seed inicial cargado: 1 tenant, 13 cadenas, 362 SKUs, 6 reglas de posicionamiento.
