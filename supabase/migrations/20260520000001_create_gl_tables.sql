-- ============================================================
-- Gestor de Listas de Precios — Avanti Uruguay
-- Migración completa de tablas gl_ con RLS y seed inicial
-- Ejecutar en proyecto: avanti-comercial (lnldlsslkorjilmiumrj)
-- ============================================================

-- 1. TABLAS BASE
CREATE TABLE IF NOT EXISTS gl_tenants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  slug       text UNIQUE NOT NULL,
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_usuarios (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid REFERENCES gl_tenants(id) ON DELETE CASCADE,
  nombre     text,
  rol        text NOT NULL CHECK (rol IN ('admin','gerencia','comercial')),
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_cadenas (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES gl_tenants(id) ON DELETE CASCADE,
  nombre                  text NOT NULL,
  tipo                    text NOT NULL CHECK (tipo IN ('supermercado','distribuidor','revendedor','delivery','interior','comercio')),
  nombre_monitor          text,
  descuento_pct           numeric(6,4),
  margen_markup_pct       numeric(6,4),
  calculo_base            text CHECK (calculo_base IN ('descuento_pvp','markup_costo')),
  iva_incluido_output     boolean DEFAULT true,
  mostrar_precio_sin_iva  boolean DEFAULT false,
  mostrar_pvp_sugerido    boolean DEFAULT true,
  formato_output          text CHECK (formato_output IN ('pdf_avanti','pdf_especialista','xlsx_generico','xlsx_pedidosya','xlsx_gdu','xlsx_kinko','xlsm_tienda_inglesa')),
  template_email          text,
  contacto_email          text[],
  codigo_proveedor_cadena text,
  activo                  boolean DEFAULT true,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_skus (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES gl_tenants(id) ON DELETE CASCADE,
  producto_id   integer REFERENCES pm_productos(producto_id),
  cod_interno   text NOT NULL,
  ean           text,
  descripcion   text NOT NULL,
  marca         text,
  categoria     text,
  familia       text,
  sub_familia   text,
  gramaje       text,
  unidades_caja integer,
  iva_rate      numeric(4,2) NOT NULL CHECK (iva_rate IN (0.10, 0.22, 0)),
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (tenant_id, cod_interno)
);

CREATE TABLE IF NOT EXISTS gl_cadena_skus (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadena_id            uuid NOT NULL REFERENCES gl_cadenas(id) ON DELETE CASCADE,
  sku_id               uuid NOT NULL REFERENCES gl_skus(id) ON DELETE CASCADE,
  cod_interno_cadena   text,
  unidades_caja_cadena integer,
  activo               boolean DEFAULT true,
  UNIQUE (cadena_id, sku_id)
);

CREATE TABLE IF NOT EXISTS gl_reglas_posicionamiento (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES gl_tenants(id) ON DELETE CASCADE,
  cadena_id               uuid REFERENCES gl_cadenas(id) ON DELETE CASCADE,
  familia                 text,
  sub_familia             text,
  tipo_regla              text NOT NULL CHECK (tipo_regla IN ('margen_fijo','pvp_objetivo','relativo_competidor','mantener')),
  margen_objetivo_pct     numeric(6,4),
  pvp_objetivo            numeric(12,2),
  competidor_referencia   text,
  delta_vs_competidor_pct numeric(6,4),
  vigente_desde           date,
  vigente_hasta           date,
  aprobado_por            uuid REFERENCES gl_usuarios(id),
  created_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_actualizaciones (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES gl_tenants(id) ON DELETE CASCADE,
  nombre                 text,
  fecha_vigencia         date NOT NULL,
  estado                 text NOT NULL CHECK (estado IN ('borrador','calculo_aprobado','listas_aprobadas','enviado')) DEFAULT 'borrador',
  archivo_ingenieria_url text,
  creado_por             uuid REFERENCES gl_usuarios(id),
  aprobado_calculo_por   uuid REFERENCES gl_usuarios(id),
  aprobado_listas_por    uuid REFERENCES gl_usuarios(id),
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_actualizacion_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actualizacion_id uuid NOT NULL REFERENCES gl_actualizaciones(id) ON DELETE CASCADE,
  sku_id           uuid NOT NULL REFERENCES gl_skus(id),
  cadena_id        uuid NOT NULL REFERENCES gl_cadenas(id),
  pcosto_anterior  numeric(12,4),
  pcosto_nuevo     numeric(12,4),
  delta_costo_pct  numeric(8,4),
  pvp_anterior     numeric(12,2),
  pvp_bruto        numeric(12,4),
  pvp_redondeado   numeric(12,2),
  pvp_sin_iva      numeric(12,4),
  fraccion_empresa numeric(12,4),
  delta_pvp_pct    numeric(8,4),
  margen_pct       numeric(8,4),
  regla_aplicada_id uuid REFERENCES gl_reglas_posicionamiento(id),
  ajuste_manual    boolean DEFAULT false,
  nota             text
);

CREATE TABLE IF NOT EXISTS gl_archivos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actualizacion_id uuid NOT NULL REFERENCES gl_actualizaciones(id) ON DELETE CASCADE,
  cadena_id        uuid NOT NULL REFERENCES gl_cadenas(id),
  tipo             text NOT NULL CHECK (tipo IN ('excel','pdf')),
  url              text,
  generado_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_envios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actualizacion_id uuid NOT NULL REFERENCES gl_actualizaciones(id) ON DELETE CASCADE,
  cadena_id        uuid NOT NULL REFERENCES gl_cadenas(id),
  destinatarios    text[] NOT NULL,
  cc               text[],
  asunto           text,
  archivos_adjuntos text[],
  estado           text NOT NULL CHECK (estado IN ('pendiente','enviado','error')) DEFAULT 'pendiente',
  enviado_at       timestamptz,
  error_msg        text,
  created_at       timestamptz DEFAULT now()
);

-- 2. RLS + POLÍTICAS (ver migración completa en Supabase Dashboard)
-- Las políticas ya fueron aplicadas directamente al proyecto.

-- 3. SEED: ejecutar después de crear el primer usuario admin en Supabase Auth
-- INSERT INTO gl_usuarios (id, tenant_id, nombre, rol)
-- VALUES ('<uuid-del-usuario>', '00000000-0000-0000-0000-000000000001', 'Admin', 'admin');
