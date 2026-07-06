export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acuerdos: {
        Row: {
          accion_sugerida: string | null
          acuerdo_padre_id: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          created_at: string | null
          cumple_objetivo: boolean | null
          descuento_pct: number | null
          es_padre_grupo: boolean | null
          estado: string | null
          estado_display: string | null
          fecha_archivo: string | null
          fecha_cierre: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_visita: string
          grupo_cliente_id: string | null
          grupo_municipio: string | null
          id: number
          insight_fecha_proceso: string | null
          insight_origen: string | null
          kgs_base_8w: number | null
          kgs_base_grupo: number | null
          kgs_equilibrio: number | null
          kgs_prom_antes: number | null
          kgs_prom_durante: number | null
          kgs_promedio_cierre: number | null
          kgs_total_periodo: number | null
          lineas_json: Json | null
          marca_nombre: string | null
          mb_categoria: number | null
          notas: string | null
          objetivo_kgs: number | null
          objetivo_kgs_grupo: number | null
          objetivo_uyu: number | null
          observaciones: string | null
          origen_carga: string | null
          periodo_semanas: number | null
          persona_id: number
          persona_nombre: string | null
          prioridad: string | null
          puntaje_resultado: number | null
          q_linea: string | null
          recomendacion_origen_id: number | null
          resultado_final: string | null
          score_prioridad: number | null
          seguimiento: string | null
          semaforo_actual: string | null
          semanas_empeorando: number | null
          semanas_mejorando: number | null
          semanas_totales: number | null
          tipo_accion: string | null
          tipo_acuerdo: string | null
          tipo_oportunidad: string | null
          usuario_id: number | null
          uyu_total_periodo: number | null
          var_vs_antes_pct: number | null
          var_vs_base_final: number | null
          visita_id: number | null
        }
        Insert: {
          accion_sugerida?: string | null
          acuerdo_padre_id?: number | null
          cliente_id?: number | null
          cliente_nombre?: string | null
          created_at?: string | null
          cumple_objetivo?: boolean | null
          descuento_pct?: number | null
          es_padre_grupo?: boolean | null
          estado?: string | null
          estado_display?: string | null
          fecha_archivo?: string | null
          fecha_cierre?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_visita: string
          grupo_cliente_id?: string | null
          grupo_municipio?: string | null
          id?: number
          insight_fecha_proceso?: string | null
          insight_origen?: string | null
          kgs_base_8w?: number | null
          kgs_base_grupo?: number | null
          kgs_equilibrio?: number | null
          kgs_prom_antes?: number | null
          kgs_prom_durante?: number | null
          kgs_promedio_cierre?: number | null
          kgs_total_periodo?: number | null
          lineas_json?: Json | null
          marca_nombre?: string | null
          mb_categoria?: number | null
          notas?: string | null
          objetivo_kgs?: number | null
          objetivo_kgs_grupo?: number | null
          objetivo_uyu?: number | null
          observaciones?: string | null
          origen_carga?: string | null
          periodo_semanas?: number | null
          persona_id: number
          persona_nombre?: string | null
          prioridad?: string | null
          puntaje_resultado?: number | null
          q_linea?: string | null
          recomendacion_origen_id?: number | null
          resultado_final?: string | null
          score_prioridad?: number | null
          seguimiento?: string | null
          semaforo_actual?: string | null
          semanas_empeorando?: number | null
          semanas_mejorando?: number | null
          semanas_totales?: number | null
          tipo_accion?: string | null
          tipo_acuerdo?: string | null
          tipo_oportunidad?: string | null
          usuario_id?: number | null
          uyu_total_periodo?: number | null
          var_vs_antes_pct?: number | null
          var_vs_base_final?: number | null
          visita_id?: number | null
        }
        Update: {
          accion_sugerida?: string | null
          acuerdo_padre_id?: number | null
          cliente_id?: number | null
          cliente_nombre?: string | null
          created_at?: string | null
          cumple_objetivo?: boolean | null
          descuento_pct?: number | null
          es_padre_grupo?: boolean | null
          estado?: string | null
          estado_display?: string | null
          fecha_archivo?: string | null
          fecha_cierre?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_visita?: string
          grupo_cliente_id?: string | null
          grupo_municipio?: string | null
          id?: number
          insight_fecha_proceso?: string | null
          insight_origen?: string | null
          kgs_base_8w?: number | null
          kgs_base_grupo?: number | null
          kgs_equilibrio?: number | null
          kgs_prom_antes?: number | null
          kgs_prom_durante?: number | null
          kgs_promedio_cierre?: number | null
          kgs_total_periodo?: number | null
          lineas_json?: Json | null
          marca_nombre?: string | null
          mb_categoria?: number | null
          notas?: string | null
          objetivo_kgs?: number | null
          objetivo_kgs_grupo?: number | null
          objetivo_uyu?: number | null
          observaciones?: string | null
          origen_carga?: string | null
          periodo_semanas?: number | null
          persona_id?: number
          persona_nombre?: string | null
          prioridad?: string | null
          puntaje_resultado?: number | null
          q_linea?: string | null
          recomendacion_origen_id?: number | null
          resultado_final?: string | null
          score_prioridad?: number | null
          seguimiento?: string | null
          semaforo_actual?: string | null
          semanas_empeorando?: number | null
          semanas_mejorando?: number | null
          semanas_totales?: number | null
          tipo_accion?: string | null
          tipo_acuerdo?: string | null
          tipo_oportunidad?: string | null
          usuario_id?: number | null
          uyu_total_periodo?: number | null
          var_vs_antes_pct?: number | null
          var_vs_base_final?: number | null
          visita_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acuerdos_acuerdo_padre_id_fkey"
            columns: ["acuerdo_padre_id"]
            isOneToOne: false
            referencedRelation: "acuerdos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acuerdos_acuerdo_padre_id_fkey"
            columns: ["acuerdo_padre_id"]
            isOneToOne: false
            referencedRelation: "vw_acuerdos_activos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          canal: string | null
          cliente_id: number | null
          email: string | null
          grupo_municipio: string | null
          grupo_nombre: string | null
          id: number
          municipio: string | null
          nombre: string
          recibe_informe: number | null
          segmento: string | null
          zona_nombre: string | null
        }
        Insert: {
          canal?: string | null
          cliente_id?: number | null
          email?: string | null
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          id?: number
          municipio?: string | null
          nombre: string
          recibe_informe?: number | null
          segmento?: string | null
          zona_nombre?: string | null
        }
        Update: {
          canal?: string | null
          cliente_id?: number | null
          email?: string | null
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          id?: number
          municipio?: string | null
          nombre?: string
          recibe_informe?: number | null
          segmento?: string | null
          zona_nombre?: string | null
        }
        Relationships: []
      }
      eloisa_contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: number
          interaction_count: number | null
          last_interaction: string | null
          name: string | null
          notes: string | null
          priority: string | null
          relationship: string | null
          tone: string | null
          updated_at: string | null
          vip: boolean | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: number
          interaction_count?: number | null
          last_interaction?: string | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          relationship?: string | null
          tone?: string | null
          updated_at?: string | null
          vip?: boolean | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: number
          interaction_count?: number | null
          last_interaction?: string | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          relationship?: string | null
          tone?: string | null
          updated_at?: string | null
          vip?: boolean | null
        }
        Relationships: []
      }
      eloisa_conversation_history: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: number
          role: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          id?: number
          role: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: number
          role?: string
        }
        Relationships: []
      }
      eloisa_profile: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      eloisa_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: number
          priority: string
          source: string | null
          source_detail: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: number
          priority?: string
          source?: string | null
          source_detail?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: number
          priority?: string
          source?: string | null
          source_detail?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipos_supervisor: {
        Row: {
          activo: boolean
          created_at: string | null
          id: number
          supervisor_id: number
          vendedor_id: number
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          id?: number
          supervisor_id: number
          vendedor_id: number
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          id?: number
          supervisor_id?: number
          vendedor_id?: number
        }
        Relationships: []
      }
      gl_actualizacion_items: {
        Row: {
          actualizacion_id: string
          ajuste_manual: boolean | null
          cadena_id: string
          delta_costo_pct: number | null
          delta_pvp_pct: number | null
          fraccion_empresa: number | null
          id: string
          margen_pct: number | null
          nota: string | null
          pcosto_anterior: number | null
          pcosto_nuevo: number | null
          pvp_anterior: number | null
          pvp_bruto: number | null
          pvp_redondeado: number | null
          pvp_sin_iva: number | null
          regla_aplicada_id: string | null
          sku_id: string
        }
        Insert: {
          actualizacion_id: string
          ajuste_manual?: boolean | null
          cadena_id: string
          delta_costo_pct?: number | null
          delta_pvp_pct?: number | null
          fraccion_empresa?: number | null
          id?: string
          margen_pct?: number | null
          nota?: string | null
          pcosto_anterior?: number | null
          pcosto_nuevo?: number | null
          pvp_anterior?: number | null
          pvp_bruto?: number | null
          pvp_redondeado?: number | null
          pvp_sin_iva?: number | null
          regla_aplicada_id?: string | null
          sku_id: string
        }
        Update: {
          actualizacion_id?: string
          ajuste_manual?: boolean | null
          cadena_id?: string
          delta_costo_pct?: number | null
          delta_pvp_pct?: number | null
          fraccion_empresa?: number | null
          id?: string
          margen_pct?: number | null
          nota?: string | null
          pcosto_anterior?: number | null
          pcosto_nuevo?: number | null
          pvp_anterior?: number | null
          pvp_bruto?: number | null
          pvp_redondeado?: number | null
          pvp_sin_iva?: number | null
          regla_aplicada_id?: string | null
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_actualizacion_items_actualizacion_id_fkey"
            columns: ["actualizacion_id"]
            isOneToOne: false
            referencedRelation: "gl_actualizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_actualizacion_items_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "gl_cadenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_actualizacion_items_regla_aplicada_id_fkey"
            columns: ["regla_aplicada_id"]
            isOneToOne: false
            referencedRelation: "gl_reglas_posicionamiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_actualizacion_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "gl_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_actualizaciones: {
        Row: {
          aprobado_calculo_por: string | null
          aprobado_listas_por: string | null
          archivo_ingenieria_url: string | null
          creado_por: string | null
          created_at: string | null
          estado: string
          fecha_vigencia: string
          id: string
          nombre: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          aprobado_calculo_por?: string | null
          aprobado_listas_por?: string | null
          archivo_ingenieria_url?: string | null
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_vigencia: string
          id?: string
          nombre?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          aprobado_calculo_por?: string | null
          aprobado_listas_por?: string | null
          archivo_ingenieria_url?: string | null
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_vigencia?: string
          id?: string
          nombre?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_actualizaciones_aprobado_calculo_por_fkey"
            columns: ["aprobado_calculo_por"]
            isOneToOne: false
            referencedRelation: "gl_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_actualizaciones_aprobado_listas_por_fkey"
            columns: ["aprobado_listas_por"]
            isOneToOne: false
            referencedRelation: "gl_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_actualizaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "gl_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_actualizaciones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "gl_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_archivos: {
        Row: {
          actualizacion_id: string
          cadena_id: string
          generado_at: string | null
          id: string
          tipo: string
          url: string | null
        }
        Insert: {
          actualizacion_id: string
          cadena_id: string
          generado_at?: string | null
          id?: string
          tipo: string
          url?: string | null
        }
        Update: {
          actualizacion_id?: string
          cadena_id?: string
          generado_at?: string | null
          id?: string
          tipo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_archivos_actualizacion_id_fkey"
            columns: ["actualizacion_id"]
            isOneToOne: false
            referencedRelation: "gl_actualizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_archivos_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "gl_cadenas"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_cadena_skus: {
        Row: {
          activo: boolean | null
          cadena_id: string
          cod_interno_cadena: string | null
          id: string
          sku_id: string
          unidades_caja_cadena: number | null
        }
        Insert: {
          activo?: boolean | null
          cadena_id: string
          cod_interno_cadena?: string | null
          id?: string
          sku_id: string
          unidades_caja_cadena?: number | null
        }
        Update: {
          activo?: boolean | null
          cadena_id?: string
          cod_interno_cadena?: string | null
          id?: string
          sku_id?: string
          unidades_caja_cadena?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_cadena_skus_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "gl_cadenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_cadena_skus_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "gl_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_cadenas: {
        Row: {
          activo: boolean | null
          calculo_base: string | null
          codigo_proveedor_cadena: string | null
          contacto_email: string[] | null
          created_at: string | null
          descuento_pct: number | null
          formato_output: string | null
          id: string
          iva_incluido_output: boolean | null
          margen_markup_pct: number | null
          mostrar_precio_sin_iva: boolean | null
          mostrar_pvp_sugerido: boolean | null
          nombre: string
          nombre_monitor: string | null
          template_email: string | null
          tenant_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          calculo_base?: string | null
          codigo_proveedor_cadena?: string | null
          contacto_email?: string[] | null
          created_at?: string | null
          descuento_pct?: number | null
          formato_output?: string | null
          id?: string
          iva_incluido_output?: boolean | null
          margen_markup_pct?: number | null
          mostrar_precio_sin_iva?: boolean | null
          mostrar_pvp_sugerido?: boolean | null
          nombre: string
          nombre_monitor?: string | null
          template_email?: string | null
          tenant_id: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          calculo_base?: string | null
          codigo_proveedor_cadena?: string | null
          contacto_email?: string[] | null
          created_at?: string | null
          descuento_pct?: number | null
          formato_output?: string | null
          id?: string
          iva_incluido_output?: boolean | null
          margen_markup_pct?: number | null
          mostrar_precio_sin_iva?: boolean | null
          mostrar_pvp_sugerido?: boolean | null
          nombre?: string
          nombre_monitor?: string | null
          template_email?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_cadenas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "gl_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_envios: {
        Row: {
          actualizacion_id: string
          archivos_adjuntos: string[] | null
          asunto: string | null
          cadena_id: string
          cc: string[] | null
          created_at: string | null
          destinatarios: string[]
          enviado_at: string | null
          error_msg: string | null
          estado: string
          id: string
        }
        Insert: {
          actualizacion_id: string
          archivos_adjuntos?: string[] | null
          asunto?: string | null
          cadena_id: string
          cc?: string[] | null
          created_at?: string | null
          destinatarios: string[]
          enviado_at?: string | null
          error_msg?: string | null
          estado?: string
          id?: string
        }
        Update: {
          actualizacion_id?: string
          archivos_adjuntos?: string[] | null
          asunto?: string | null
          cadena_id?: string
          cc?: string[] | null
          created_at?: string | null
          destinatarios?: string[]
          enviado_at?: string | null
          error_msg?: string | null
          estado?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_envios_actualizacion_id_fkey"
            columns: ["actualizacion_id"]
            isOneToOne: false
            referencedRelation: "gl_actualizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_envios_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "gl_cadenas"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_marca_segmento: {
        Row: {
          activo: boolean
          created_at: string | null
          id: string
          marca: string
          segmento: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          id?: string
          marca: string
          segmento: string
          tenant_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          id?: string
          marca?: string
          segmento?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_marca_segmento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "gl_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_reglas_posicionamiento: {
        Row: {
          aprobado_por: string | null
          cadena_id: string | null
          competidor_referencia: string | null
          created_at: string | null
          delta_vs_competidor_pct: number | null
          familia: string | null
          id: string
          margen_objetivo_pct: number | null
          pvp_objetivo: number | null
          sub_familia: string | null
          tenant_id: string
          tipo_regla: string
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          aprobado_por?: string | null
          cadena_id?: string | null
          competidor_referencia?: string | null
          created_at?: string | null
          delta_vs_competidor_pct?: number | null
          familia?: string | null
          id?: string
          margen_objetivo_pct?: number | null
          pvp_objetivo?: number | null
          sub_familia?: string | null
          tenant_id: string
          tipo_regla: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          aprobado_por?: string | null
          cadena_id?: string | null
          competidor_referencia?: string | null
          created_at?: string | null
          delta_vs_competidor_pct?: number | null
          familia?: string | null
          id?: string
          margen_objetivo_pct?: number | null
          pvp_objetivo?: number | null
          sub_familia?: string | null
          tenant_id?: string
          tipo_regla?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_reglas_posicionamiento_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "gl_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_reglas_posicionamiento_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "gl_cadenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_reglas_posicionamiento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "gl_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_skus: {
        Row: {
          activo: boolean | null
          categoria: string | null
          cod_interno: string
          created_at: string | null
          descripcion: string
          ean: string | null
          familia: string | null
          gramaje: string | null
          grupo_comparable: number | null
          id: string
          iva_rate: number
          marca: string | null
          producto_id: number | null
          sub_familia: string | null
          tenant_id: string
          unidades_caja: number | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          cod_interno: string
          created_at?: string | null
          descripcion: string
          ean?: string | null
          familia?: string | null
          gramaje?: string | null
          grupo_comparable?: number | null
          id?: string
          iva_rate: number
          marca?: string | null
          producto_id?: number | null
          sub_familia?: string | null
          tenant_id: string
          unidades_caja?: number | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          cod_interno?: string
          created_at?: string | null
          descripcion?: string
          ean?: string | null
          familia?: string | null
          gramaje?: string | null
          grupo_comparable?: number | null
          id?: string
          iva_rate?: number
          marca?: string | null
          producto_id?: number | null
          sub_familia?: string | null
          tenant_id?: string
          unidades_caja?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_skus_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "pm_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "gl_skus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "gl_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_tenants: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      gl_usuarios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre: string | null
          rol: string
          tenant_id: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id: string
          nombre?: string | null
          rol: string
          tenant_id?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre?: string | null
          rol?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "gl_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_ventas: {
        Row: {
          anio: number | null
          cliente_id: number
          cliente_nombre: string | null
          created_at: string | null
          grupo_municipio: string | null
          grupo_nombre: string | null
          id: number
          kgs_rolling_12w: number | null
          kgs_rolling_12w_ly: number | null
          kgs_rolling_26w: number | null
          kgs_rolling_26w_ly: number | null
          kgs_rolling_26w_ly_univ: number | null
          kgs_rolling_26w_univ: number | null
          kgs_semana: number | null
          kgs_semana_ly: number | null
          marca_nombre: string
          mes: number | null
          mtd_kgs: number | null
          mtd_kgs_ly: number | null
          mtd_uyu: number | null
          mtd_uyu_ly: number | null
          municipio: string | null
          persona_id: number
          persona_nombre: string | null
          portafolio_nombre: string | null
          q_categoria: string | null
          q_grupo: string | null
          q_linea: string
          segmento: string | null
          uyu_neto: number | null
          uyu_neto_ly: number | null
          var_rolling_12w: number | null
          var_rolling_26w: number | null
          var_rolling_26w_univ: number | null
          week_no: string | null
          week_start_date: string
          ytd_kgs: number | null
          ytd_kgs_ly: number | null
          ytd_uyu: number | null
          ytd_uyu_ly: number | null
          zona_nombre: string | null
        }
        Insert: {
          anio?: number | null
          cliente_id: number
          cliente_nombre?: string | null
          created_at?: string | null
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          id?: number
          kgs_rolling_12w?: number | null
          kgs_rolling_12w_ly?: number | null
          kgs_rolling_26w?: number | null
          kgs_rolling_26w_ly?: number | null
          kgs_rolling_26w_ly_univ?: number | null
          kgs_rolling_26w_univ?: number | null
          kgs_semana?: number | null
          kgs_semana_ly?: number | null
          marca_nombre: string
          mes?: number | null
          mtd_kgs?: number | null
          mtd_kgs_ly?: number | null
          mtd_uyu?: number | null
          mtd_uyu_ly?: number | null
          municipio?: string | null
          persona_id: number
          persona_nombre?: string | null
          portafolio_nombre?: string | null
          q_categoria?: string | null
          q_grupo?: string | null
          q_linea: string
          segmento?: string | null
          uyu_neto?: number | null
          uyu_neto_ly?: number | null
          var_rolling_12w?: number | null
          var_rolling_26w?: number | null
          var_rolling_26w_univ?: number | null
          week_no?: string | null
          week_start_date: string
          ytd_kgs?: number | null
          ytd_kgs_ly?: number | null
          ytd_uyu?: number | null
          ytd_uyu_ly?: number | null
          zona_nombre?: string | null
        }
        Update: {
          anio?: number | null
          cliente_id?: number
          cliente_nombre?: string | null
          created_at?: string | null
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          id?: number
          kgs_rolling_12w?: number | null
          kgs_rolling_12w_ly?: number | null
          kgs_rolling_26w?: number | null
          kgs_rolling_26w_ly?: number | null
          kgs_rolling_26w_ly_univ?: number | null
          kgs_rolling_26w_univ?: number | null
          kgs_semana?: number | null
          kgs_semana_ly?: number | null
          marca_nombre?: string
          mes?: number | null
          mtd_kgs?: number | null
          mtd_kgs_ly?: number | null
          mtd_uyu?: number | null
          mtd_uyu_ly?: number | null
          municipio?: string | null
          persona_id?: number
          persona_nombre?: string | null
          portafolio_nombre?: string | null
          q_categoria?: string | null
          q_grupo?: string | null
          q_linea?: string
          segmento?: string | null
          uyu_neto?: number | null
          uyu_neto_ly?: number | null
          var_rolling_12w?: number | null
          var_rolling_26w?: number | null
          var_rolling_26w_univ?: number | null
          week_no?: string | null
          week_start_date?: string
          ytd_kgs?: number | null
          ytd_kgs_ly?: number | null
          ytd_uyu?: number | null
          ytd_uyu_ly?: number | null
          zona_nombre?: string | null
        }
        Relationships: []
      }
      insights_cliente_semana: {
        Row: {
          anio: number | null
          anio_semana: string | null
          base_historica_solida: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          grupo_municipio: string | null
          grupo_nombre: string | null
          kgs_rolling_12w: number | null
          kgs_rolling_12w_ly: number | null
          kgs_rolling_26w: number | null
          kgs_rolling_26w_ly: number | null
          kgs_rolling_26w_ly_univ: number | null
          kgs_rolling_26w_univ: number | null
          kgs_semana: number | null
          kgs_semana_ly: number | null
          lineas_activas: number | null
          marcas_activas: number | null
          mes: number | null
          motivo_estado: string | null
          mtd_kgs: number | null
          mtd_kgs_ly: number | null
          mtd_uyu: number | null
          mtd_uyu_ly: number | null
          municipio: string | null
          oport_incremental_uyu: number | null
          persona_id: number | null
          persona_nombre: string | null
          portafolios_activos: number | null
          q_grupo: string | null
          score_prioridad: number | null
          segmento: string | null
          semaforo: string | null
          sin_historial_real: boolean | null
          sin_insight_automatico: boolean | null
          tiene_historial: number | null
          tipo_oportunidad_cliente: string | null
          uyu_semana: number | null
          uyu_semana_ly: number | null
          var_mtd_pct: number | null
          var_rolling_12w: number | null
          var_rolling_12w_real: number | null
          var_rolling_26w: number | null
          var_rolling_26w_real: number | null
          var_rolling_26w_univ: number | null
          var_semana_pct: number | null
          var_ytd_pct: number | null
          week_no: string | null
          ytd_kgs: number | null
          ytd_kgs_ly: number | null
          ytd_uyu: number | null
          ytd_uyu_ly: number | null
        }
        Insert: {
          anio?: number | null
          anio_semana?: string | null
          base_historica_solida?: number | null
          cliente_id?: number | null
          cliente_nombre?: string | null
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          kgs_rolling_12w?: number | null
          kgs_rolling_12w_ly?: number | null
          kgs_rolling_26w?: number | null
          kgs_rolling_26w_ly?: number | null
          kgs_rolling_26w_ly_univ?: number | null
          kgs_rolling_26w_univ?: number | null
          kgs_semana?: number | null
          kgs_semana_ly?: number | null
          lineas_activas?: number | null
          marcas_activas?: number | null
          mes?: number | null
          motivo_estado?: string | null
          mtd_kgs?: number | null
          mtd_kgs_ly?: number | null
          mtd_uyu?: number | null
          mtd_uyu_ly?: number | null
          municipio?: string | null
          oport_incremental_uyu?: number | null
          persona_id?: number | null
          persona_nombre?: string | null
          portafolios_activos?: number | null
          q_grupo?: string | null
          score_prioridad?: number | null
          segmento?: string | null
          semaforo?: string | null
          sin_historial_real?: boolean | null
          sin_insight_automatico?: boolean | null
          tiene_historial?: number | null
          tipo_oportunidad_cliente?: string | null
          uyu_semana?: number | null
          uyu_semana_ly?: number | null
          var_mtd_pct?: number | null
          var_rolling_12w?: number | null
          var_rolling_12w_real?: number | null
          var_rolling_26w?: number | null
          var_rolling_26w_real?: number | null
          var_rolling_26w_univ?: number | null
          var_semana_pct?: number | null
          var_ytd_pct?: number | null
          week_no?: string | null
          ytd_kgs?: number | null
          ytd_kgs_ly?: number | null
          ytd_uyu?: number | null
          ytd_uyu_ly?: number | null
        }
        Update: {
          anio?: number | null
          anio_semana?: string | null
          base_historica_solida?: number | null
          cliente_id?: number | null
          cliente_nombre?: string | null
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          kgs_rolling_12w?: number | null
          kgs_rolling_12w_ly?: number | null
          kgs_rolling_26w?: number | null
          kgs_rolling_26w_ly?: number | null
          kgs_rolling_26w_ly_univ?: number | null
          kgs_rolling_26w_univ?: number | null
          kgs_semana?: number | null
          kgs_semana_ly?: number | null
          lineas_activas?: number | null
          marcas_activas?: number | null
          mes?: number | null
          motivo_estado?: string | null
          mtd_kgs?: number | null
          mtd_kgs_ly?: number | null
          mtd_uyu?: number | null
          mtd_uyu_ly?: number | null
          municipio?: string | null
          oport_incremental_uyu?: number | null
          persona_id?: number | null
          persona_nombre?: string | null
          portafolios_activos?: number | null
          q_grupo?: string | null
          score_prioridad?: number | null
          segmento?: string | null
          semaforo?: string | null
          sin_historial_real?: boolean | null
          sin_insight_automatico?: boolean | null
          tiene_historial?: number | null
          tipo_oportunidad_cliente?: string | null
          uyu_semana?: number | null
          uyu_semana_ly?: number | null
          var_mtd_pct?: number | null
          var_rolling_12w?: number | null
          var_rolling_12w_real?: number | null
          var_rolling_26w?: number | null
          var_rolling_26w_real?: number | null
          var_rolling_26w_univ?: number | null
          var_semana_pct?: number | null
          var_ytd_pct?: number | null
          week_no?: string | null
          ytd_kgs?: number | null
          ytd_kgs_ly?: number | null
          ytd_uyu?: number | null
          ytd_uyu_ly?: number | null
        }
        Relationships: []
      }
      insights_semana: {
        Row: {
          accion_sugerida: string | null
          argumento_benchmark: string | null
          argumento_historico: string | null
          bench_kgs_promedio: number | null
          bench_uyu_promedio: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          clientes_en_segmento: number | null
          created_at: string | null
          fecha_proceso: string
          grupo_municipio: string | null
          grupo_nombre: string | null
          id: number
          kgs_semana: number | null
          marca_nombre: string | null
          municipio: string | null
          oport_incremental_uyu: number | null
          persona_id: number | null
          persona_nombre: string | null
          prom_kgs_8w: number | null
          q_grupo: string | null
          q_linea: string | null
          rank_cliente: number | null
          recomendacion_base: string | null
          score_prioridad: number | null
          segmento: string | null
          semaforo: string | null
          semanas_con_venta_8w: number | null
          tipo_oportunidad: string | null
          uyu_neto: number | null
          var_rolling_12w: number | null
          var_vs_bench: number | null
          zona_nombre: string | null
        }
        Insert: {
          accion_sugerida?: string | null
          argumento_benchmark?: string | null
          argumento_historico?: string | null
          bench_kgs_promedio?: number | null
          bench_uyu_promedio?: number | null
          cliente_id?: number | null
          cliente_nombre?: string | null
          clientes_en_segmento?: number | null
          created_at?: string | null
          fecha_proceso: string
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          id?: number
          kgs_semana?: number | null
          marca_nombre?: string | null
          municipio?: string | null
          oport_incremental_uyu?: number | null
          persona_id?: number | null
          persona_nombre?: string | null
          prom_kgs_8w?: number | null
          q_grupo?: string | null
          q_linea?: string | null
          rank_cliente?: number | null
          recomendacion_base?: string | null
          score_prioridad?: number | null
          segmento?: string | null
          semaforo?: string | null
          semanas_con_venta_8w?: number | null
          tipo_oportunidad?: string | null
          uyu_neto?: number | null
          var_rolling_12w?: number | null
          var_vs_bench?: number | null
          zona_nombre?: string | null
        }
        Update: {
          accion_sugerida?: string | null
          argumento_benchmark?: string | null
          argumento_historico?: string | null
          bench_kgs_promedio?: number | null
          bench_uyu_promedio?: number | null
          cliente_id?: number | null
          cliente_nombre?: string | null
          clientes_en_segmento?: number | null
          created_at?: string | null
          fecha_proceso?: string
          grupo_municipio?: string | null
          grupo_nombre?: string | null
          id?: number
          kgs_semana?: number | null
          marca_nombre?: string | null
          municipio?: string | null
          oport_incremental_uyu?: number | null
          persona_id?: number | null
          persona_nombre?: string | null
          prom_kgs_8w?: number | null
          q_grupo?: string | null
          q_linea?: string | null
          rank_cliente?: number | null
          recomendacion_base?: string | null
          score_prioridad?: number | null
          segmento?: string | null
          semaforo?: string | null
          semanas_con_venta_8w?: number | null
          tipo_oportunidad?: string | null
          uyu_neto?: number | null
          var_rolling_12w?: number | null
          var_vs_bench?: number | null
          zona_nombre?: string | null
        }
        Relationships: []
      }
      ofertas: {
        Row: {
          acuerdo_id: number | null
          canal: string | null
          cliente: string | null
          comentarios: string | null
          created_at: string | null
          descuento: number | null
          exportada_excel: boolean | null
          fecha_final: string | null
          fecha_inicio: string | null
          grupo_nombre: string | null
          id: string
          producto: string | null
          tipo_oferta: string
          vendedor: string | null
        }
        Insert: {
          acuerdo_id?: number | null
          canal?: string | null
          cliente?: string | null
          comentarios?: string | null
          created_at?: string | null
          descuento?: number | null
          exportada_excel?: boolean | null
          fecha_final?: string | null
          fecha_inicio?: string | null
          grupo_nombre?: string | null
          id?: string
          producto?: string | null
          tipo_oferta?: string
          vendedor?: string | null
        }
        Update: {
          acuerdo_id?: number | null
          canal?: string | null
          cliente?: string | null
          comentarios?: string | null
          created_at?: string | null
          descuento?: number | null
          exportada_excel?: boolean | null
          fecha_final?: string | null
          fecha_inicio?: string | null
          grupo_nombre?: string | null
          id?: string
          producto?: string | null
          tipo_oferta?: string
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_acuerdo_id_fkey"
            columns: ["acuerdo_id"]
            isOneToOne: false
            referencedRelation: "acuerdos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_acuerdo_id_fkey"
            columns: ["acuerdo_id"]
            isOneToOne: false
            referencedRelation: "vw_acuerdos_activos"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_alertas: {
        Row: {
          alerta_id: number
          cadena: string | null
          created_at: string | null
          descripcion: string | null
          fecha: string
          leida: boolean | null
          monitor_id: number | null
          producto_id: number | null
          severidad: string | null
          tipo: string | null
          valor_actual: number | null
          valor_anterior: number | null
          variacion_pct: number | null
        }
        Insert: {
          alerta_id?: number
          cadena?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha: string
          leida?: boolean | null
          monitor_id?: number | null
          producto_id?: number | null
          severidad?: string | null
          tipo?: string | null
          valor_actual?: number | null
          valor_anterior?: number | null
          variacion_pct?: number | null
        }
        Update: {
          alerta_id?: number
          cadena?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          leida?: boolean | null
          monitor_id?: number | null
          producto_id?: number | null
          severidad?: string | null
          tipo?: string | null
          valor_actual?: number | null
          valor_anterior?: number | null
          variacion_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_alertas_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "pm_monitoring"
            referencedColumns: ["monitor_id"]
          },
          {
            foreignKeyName: "pm_alertas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "pm_productos"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      pm_monitoring: {
        Row: {
          activo: boolean | null
          cadena: string | null
          created_at: string | null
          monitor_id: number
          producto_id: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          activo?: boolean | null
          cadena?: string | null
          created_at?: string | null
          monitor_id: number
          producto_id?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          activo?: boolean | null
          cadena?: string | null
          created_at?: string | null
          monitor_id?: number
          producto_id?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_monitoring_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "pm_productos"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      pm_precios: {
        Row: {
          created_at: string | null
          fecha: string
          id: number
          monitor_id: number | null
          precio: number | null
          stock: boolean | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          id?: number
          monitor_id?: number | null
          precio?: number | null
          stock?: boolean | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: number
          monitor_id?: number | null
          precio?: number | null
          stock?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_precios_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "pm_monitoring"
            referencedColumns: ["monitor_id"]
          },
        ]
      }
      pm_productos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          ean: string | null
          familia: string | null
          grupo_comparable: number | null
          imagen_url: string | null
          marca: string | null
          peso_unidad: string | null
          portafolio: string | null
          producto_id: number
          sub_familia: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          ean?: string | null
          familia?: string | null
          grupo_comparable?: number | null
          imagen_url?: string | null
          marca?: string | null
          peso_unidad?: string | null
          portafolio?: string | null
          producto_id: number
          sub_familia?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          ean?: string | null
          familia?: string | null
          grupo_comparable?: number | null
          imagen_url?: string | null
          marca?: string | null
          peso_unidad?: string | null
          portafolio?: string | null
          producto_id?: number
          sub_familia?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      productos_comercial: {
        Row: {
          activo: boolean
          categoria: string
          created_at: string
          id: number
          linea: string
          marca: string
        }
        Insert: {
          activo?: boolean
          categoria: string
          created_at?: string
          id?: number
          linea: string
          marca: string
        }
        Update: {
          activo?: boolean
          categoria?: string
          created_at?: string
          id?: number
          linea?: string
          marca?: string
        }
        Relationships: []
      }
      seguimiento_acuerdos: {
        Row: {
          acuerdo_id: number
          created_at: string | null
          id: number
          kgs_acum: number | null
          kgs_base: number | null
          kgs_objetivo: number | null
          kgs_real: number | null
          mejoro: boolean | null
          semaforo_semana: string | null
          semana_numero: number | null
          uyu_acum: number | null
          uyu_real: number | null
          var_vs_base_pct: number | null
          week_no: string
        }
        Insert: {
          acuerdo_id: number
          created_at?: string | null
          id?: number
          kgs_acum?: number | null
          kgs_base?: number | null
          kgs_objetivo?: number | null
          kgs_real?: number | null
          mejoro?: boolean | null
          semaforo_semana?: string | null
          semana_numero?: number | null
          uyu_acum?: number | null
          uyu_real?: number | null
          var_vs_base_pct?: number | null
          week_no: string
        }
        Update: {
          acuerdo_id?: number
          created_at?: string | null
          id?: number
          kgs_acum?: number | null
          kgs_base?: number | null
          kgs_objetivo?: number | null
          kgs_real?: number | null
          mejoro?: boolean | null
          semaforo_semana?: string | null
          semana_numero?: number | null
          uyu_acum?: number | null
          uyu_real?: number | null
          var_vs_base_pct?: number | null
          week_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_acuerdos_acuerdo_id_fkey"
            columns: ["acuerdo_id"]
            isOneToOne: false
            referencedRelation: "acuerdos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_acuerdos_acuerdo_id_fkey"
            columns: ["acuerdo_id"]
            isOneToOne: false
            referencedRelation: "vw_acuerdos_activos"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimiento_recomendaciones: {
        Row: {
          anio_semana: string | null
          cliente_id: number
          created_at: string | null
          estado_ejecucion: string
          fecha_visita: string
          id: number
          marca_nombre: string | null
          nota_vendedor: string | null
          persona_id: number
          q_linea: string | null
          tipo_oportunidad: string | null
        }
        Insert: {
          anio_semana?: string | null
          cliente_id: number
          created_at?: string | null
          estado_ejecucion: string
          fecha_visita?: string
          id?: number
          marca_nombre?: string | null
          nota_vendedor?: string | null
          persona_id: number
          q_linea?: string | null
          tipo_oportunidad?: string | null
        }
        Update: {
          anio_semana?: string | null
          cliente_id?: number
          created_at?: string | null
          estado_ejecucion?: string
          fecha_visita?: string
          id?: number
          marca_nombre?: string | null
          nota_vendedor?: string | null
          persona_id?: number
          q_linea?: string | null
          tipo_oportunidad?: string | null
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          activo: boolean | null
          contrasena: string | null
          created_at: string | null
          email: string | null
          empresa_id: number | null
          persona_id: number
          persona_nombre: string
          recibe_datos: number | null
          recibe_informe: boolean | null
          rol: string | null
        }
        Insert: {
          activo?: boolean | null
          contrasena?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: number | null
          persona_id: number
          persona_nombre: string
          recibe_datos?: number | null
          recibe_informe?: boolean | null
          rol?: string | null
        }
        Update: {
          activo?: boolean | null
          contrasena?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: number | null
          persona_id?: number
          persona_nombre?: string
          recibe_datos?: number | null
          recibe_informe?: boolean | null
          rol?: string | null
        }
        Relationships: []
      }
      visitas: {
        Row: {
          activo: boolean | null
          cliente_id: number
          cliente_nombre: string | null
          created_at: string | null
          id: number
          persona_id: number
          persona_nombre: string | null
          ruta_dia: string
        }
        Insert: {
          activo?: boolean | null
          cliente_id: number
          cliente_nombre?: string | null
          created_at?: string | null
          id?: number
          persona_id: number
          persona_nombre?: string | null
          ruta_dia: string
        }
        Update: {
          activo?: boolean | null
          cliente_id?: number
          cliente_nombre?: string | null
          created_at?: string | null
          id?: number
          persona_id?: number
          persona_nombre?: string | null
          ruta_dia?: string
        }
        Relationships: []
      }
    }
    Views: {
      efectividad_acciones: {
        Row: {
          exitosos: number | null
          fallidos: number | null
          grupo_municipio: string | null
          kgs_promedio_exitoso: number | null
          marca_nombre: string | null
          parciales: number | null
          q_linea: string | null
          segmento: string | null
          semanas_promedio: number | null
          tasa_cumplimiento_pct: number | null
          tasa_exito_pct: number | null
          tipo_accion: string | null
          total_acuerdos: number | null
          var_base_promedio_exitoso: number | null
          var_base_promedio_total: number | null
          vendedores_involucrados: number | null
        }
        Relationships: []
      }
      vw_acuerdos_activos: {
        Row: {
          acuerdo_padre_id: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          created_at: string | null
          descuento_pct: number | null
          dias_restantes: number | null
          es_padre_grupo: boolean | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          grupo_cliente_id: string | null
          hijos_amarillo: number | null
          hijos_rojo: number | null
          hijos_total: number | null
          hijos_verde: number | null
          id: number | null
          kgs_acum: number | null
          kgs_acum_grupo: number | null
          kgs_base_8w: number | null
          kgs_base_grupo: number | null
          kgs_ultima_semana: number | null
          marca_nombre: string | null
          notas: string | null
          objetivo_kgs: number | null
          objetivo_kgs_grupo: number | null
          objetivo_uyu: number | null
          pct_avance_grupo: number | null
          pct_avance_objetivo: number | null
          periodo_semanas: number | null
          persona_id: number | null
          persona_nombre: string | null
          prioridad: string | null
          q_linea: string | null
          semaforo_actual: string | null
          semaforo_ultimo: string | null
          semanas_transcurridas: number | null
          tipo_accion: string | null
          tipo_oportunidad: string | null
          ultima_semana: string | null
          uyu_acum: number | null
          var_vs_base_grupo: number | null
          var_vs_base_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acuerdos_acuerdo_padre_id_fkey"
            columns: ["acuerdo_padre_id"]
            isOneToOne: false
            referencedRelation: "acuerdos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acuerdos_acuerdo_padre_id_fkey"
            columns: ["acuerdo_padre_id"]
            isOneToOne: false
            referencedRelation: "vw_acuerdos_activos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_acuerdos_cliente: {
        Row: {
          accion_sugerida: string | null
          cliente_id: number | null
          cliente_nombre: string | null
          cliente_resuelto_id: number | null
          created_at: string | null
          descuento_pct: number | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_visita: string | null
          grupo_cliente_id: string | null
          grupo_municipio: string | null
          id: number | null
          insight_fecha_proceso: string | null
          insight_origen: string | null
          kgs_acum: number | null
          kgs_promedio_cierre: number | null
          lineas_json: Json | null
          marca_nombre: string | null
          notas: string | null
          objetivo_kgs: number | null
          objetivo_uyu: number | null
          observaciones: string | null
          origen_carga: string | null
          periodo_semanas: number | null
          persona_id: number | null
          persona_nombre: string | null
          prioridad: string | null
          q_linea: string | null
          resultado_final: string | null
          scope_acuerdo: string | null
          score_prioridad: number | null
          seguimiento: string | null
          semaforo_actual: string | null
          semana_numero: number | null
          semanas_empeorando: number | null
          semanas_mejorando: number | null
          tipo_accion: string | null
          tipo_acuerdo: string | null
          tipo_oportunidad: string | null
          usuario_id: number | null
          visita_id: number | null
        }
        Relationships: []
      }
      vw_clientes_ruta_con_prioridad: {
        Row: {
          anio_semana: string | null
          cliente_id: number | null
          cliente_nombre: string | null
          grupo_municipio: string | null
          insight_no_actual: boolean | null
          kgs_rolling_12w: number | null
          kgs_rolling_12w_ly: number | null
          kgs_rolling_26w: number | null
          kgs_rolling_26w_ly: number | null
          kgs_semana: number | null
          lineas_activas: number | null
          marcas_activas: number | null
          motivo_estado: string | null
          mtd_kgs: number | null
          municipio: string | null
          persona_id: number | null
          persona_nombre: string | null
          portafolios_activos: number | null
          q_grupo: string | null
          ruta_dia: string | null
          score_prioridad: number | null
          score_prioridad_ajustado: number | null
          segmento: string | null
          semaforo: string | null
          sin_historial_real: boolean | null
          sin_insight_automatico: boolean | null
          tipo_oportunidad: string | null
          var_rolling_12w_real: number | null
          var_rolling_26w_real: number | null
          ytd_kgs: number | null
          ytd_uyu: number | null
        }
        Relationships: []
      }
      vw_informe_distribuidor_semana: {
        Row: {
          anio: number | null
          anio_semana: string | null
          cliente_id: number | null
          cliente_nombre: string | null
          email: string | null
          kgs_rolling_12w: number | null
          kgs_rolling_12w_ly: number | null
          kgs_rolling_26w: number | null
          kgs_rolling_26w_ly: number | null
          kgs_semana: number | null
          kgs_semana_ly: number | null
          marca_nombre: string | null
          mes: number | null
          mtd_kgs: number | null
          mtd_kgs_ly: number | null
          mtd_uyu: number | null
          mtd_uyu_ly: number | null
          municipio: string | null
          nivel: string | null
          persona_id: number | null
          portafolio_nombre: string | null
          q_categoria: string | null
          q_linea: string | null
          semaforo: string | null
          uyu_semana: number | null
          uyu_semana_ly: number | null
          var_pct_kgs_mtd: number | null
          var_pct_kgs_semana: number | null
          var_pct_kgs_ytd: number | null
          var_pct_rolling_12w: number | null
          var_pct_rolling_26w: number | null
          var_pct_uyu_mtd: number | null
          var_pct_uyu_semana: number | null
          var_pct_uyu_ytd: number | null
          week_no: string | null
          week_start_date: string | null
          ytd_kgs: number | null
          ytd_kgs_ly: number | null
          ytd_uyu: number | null
          ytd_uyu_ly: number | null
          zona_nombre: string | null
        }
        Relationships: []
      }
      vw_make_vendedores_envio_hoy: {
        Row: {
          email: string | null
          envio_habilitado: number | null
          persona_id: number | null
          persona_nombre: string | null
        }
        Insert: {
          email?: string | null
          envio_habilitado?: number | null
          persona_id?: number | null
          persona_nombre?: string | null
        }
        Update: {
          email?: string | null
          envio_habilitado?: number | null
          persona_id?: number | null
          persona_nombre?: string | null
        }
        Relationships: []
      }
      vw_param_reporte_semanal: {
        Row: {
          anio_actual: number | null
          mes_actual_texto: string | null
          semana_anio: number | null
          semana_seleccionada: string | null
          week_start_date: string | null
        }
        Relationships: []
      }
      vw_pm_ultimo_precio: {
        Row: {
          activo: boolean | null
          cadena: string | null
          descripcion: string | null
          ean: string | null
          familia: string | null
          fecha: string | null
          marca: string | null
          monitor_id: number | null
          portafolio: string | null
          precio: number | null
          producto_id: number | null
          stock: boolean | null
          sub_familia: string | null
          url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_monitoring_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "pm_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "pm_precios_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "pm_monitoring"
            referencedColumns: ["monitor_id"]
          },
        ]
      }
      vw_reporte_diario_detalle_visitas_marca: {
        Row: {
          clienteid: number | null
          kg_sem: number | null
          linea: string | null
          marca: string | null
          persona_id: number | null
          var_mtd: number | null
          var_sem: number | null
        }
        Relationships: []
      }
      vw_reporte_diario_recomendaciones_top3: {
        Row: {
          accion_sugerida: string | null
          argumento_benchmark: string | null
          argumento_historico: string | null
          cliente: string | null
          idcliente: number | null
          linea: string | null
          marca: string | null
          oportunidad_incremental: number | null
          persona_id: number | null
          recomendacion_base: string | null
          score_prioridad: number | null
          tipo_oportunidad: string | null
          var_rolling_12w: number | null
        }
        Relationships: []
      }
      vw_reporte_diario_resto_clientes_marca: {
        Row: {
          a_kg_sem: number | null
          b_var_sem: number | null
          c_kg_mtd: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          d_var_mtd: number | null
          e_kg_ytd: number | null
          f_var_ytd: number | null
          kg_mtd_ly: number | null
          kg_sem_ly: number | null
          kg_ytd_ly: number | null
          persona: string | null
          personano: number | null
          rank: number | null
          sem_mtd: string | null
          sem_sem: string | null
          sem_ytd: string | null
          week_start_date: string | null
        }
        Relationships: []
      }
      vw_reporte_diario_top_clientes_marca: {
        Row: {
          a_kg_sem: number | null
          b_var_sem: number | null
          c_kg_mtd: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          d_var_mtd: number | null
          e_kg_ytd: number | null
          f_var_ytd: number | null
          kg_mtd_ly: number | null
          kg_sem_ly: number | null
          kg_ytd_ly: number | null
          marca_nombre: string | null
          orden: number | null
          persona: string | null
          personano: number | null
          rank: number | null
          sem_mtd: string | null
          sem_sem: string | null
          sem_ytd: string | null
          week_start_date: string | null
        }
        Relationships: []
      }
      vw_reporte_semanal_clientes_vendedor: {
        Row: {
          a_kg_sem: number | null
          b_var_sem: number | null
          c_kg_mtd: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          d_var_mtd: number | null
          e_kg_ytd: number | null
          f_var_ytd: number | null
          kg_mtd_ly: number | null
          kg_sem_ly: number | null
          kg_ytd_ly: number | null
          persona: string | null
          personano: number | null
          rank: number | null
          sem_mtd: string | null
          sem_sem: string | null
          sem_ytd: string | null
          week_start_date: string | null
        }
        Relationships: []
      }
      vw_reporte_semanal_marcas_vendedor: {
        Row: {
          a_kg_sem: number | null
          b_var_sem: number | null
          c_kg_mtd: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          d_var_mtd: number | null
          e_kg_ytd: number | null
          f_var_ytd: number | null
          kg_mtd_ly: number | null
          kg_sem_ly: number | null
          kg_ytd_ly: number | null
          marca_nombre: string | null
          orden: number | null
          persona: string | null
          personano: number | null
          rank: number | null
          sem_mtd: string | null
          sem_sem: string | null
          sem_ytd: string | null
          week_start_date: string | null
        }
        Relationships: []
      }
      vw_supervisor_cliente_detalle: {
        Row: {
          accion_sugerida: string | null
          argumento_benchmark: string | null
          argumento_historico: string | null
          bench_kgs_promedio: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          fecha_proceso: string | null
          grupo_municipio: string | null
          kgs_semana: number | null
          marca_nombre: string | null
          municipio: string | null
          oport_incremental_uyu: number | null
          persona_id: number | null
          prom_kgs_8w: number | null
          q_linea: string | null
          recomendacion_base: string | null
          score_prioridad: number | null
          segmento: string | null
          semaforo: string | null
          supervisor_nombre: string | null
          supervisor_persona_id: number | null
          tipo_oportunidad: string | null
          uyu_neto: number | null
          var_rolling_12w: number | null
          var_vs_bench: number | null
          vendedor_nombre: string | null
          vendedor_persona_id: number | null
          zona_nombre: string | null
        }
        Relationships: []
      }
      vw_supervisor_clientes_resumen: {
        Row: {
          argumento_benchmark_principal: string | null
          argumento_historico_principal: string | null
          cantidad_lineas: number | null
          cantidad_oportunidades: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          fecha_proceso: string | null
          grupo_municipio: string | null
          linea_principal: string | null
          marca_principal: string | null
          municipio: string | null
          potencial_max_uyu: number | null
          potencial_total_uyu: number | null
          recomendacion_principal: string | null
          relevancia_total: number | null
          score_maximo: number | null
          score_promedio: number | null
          segmento: string | null
          semaforo_principal: string | null
          supervisor_id: number | null
          supervisor_nombre: string | null
          supervisor_persona_id: number | null
          tiene_acuerdo: number | null
          tipo_oportunidad_principal: string | null
          vendedor_id: number | null
          vendedor_nombre: string | null
          vendedor_persona_id: number | null
        }
        Relationships: []
      }
      vw_supervisor_dashboard_base: {
        Row: {
          argumento_benchmark: string | null
          argumento_historico: string | null
          bench_kgs_promedio: number | null
          bench_uyu_promedio: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          clientes_en_segmento: number | null
          fecha_proceso: string | null
          grupo_municipio: string | null
          kgs_semana: number | null
          marca_nombre: string | null
          municipio: string | null
          oport_incremental_uyu: number | null
          prom_kgs_8w: number | null
          q_linea: string | null
          rank_cliente: number | null
          recomendacion_base: string | null
          score_prioridad: number | null
          segmento: string | null
          semaforo: string | null
          semanas_con_venta_8w: number | null
          supervisor_id: number | null
          supervisor_nombre: string | null
          supervisor_persona_id: number | null
          tipo_oportunidad: string | null
          uyu_neto: number | null
          var_rolling_12w: number | null
          var_vs_bench: number | null
          vendedor_id: number | null
          vendedor_nombre: string | null
          vendedor_persona_id: number | null
        }
        Relationships: []
      }
      vw_vendedor_lineas_faltantes_app: {
        Row: {
          cliente_id: number | null
          cliente_nombre: string | null
          clientes_con_linea: number | null
          linea_faltante: string | null
          marca_nombre: string | null
          persona_id: number | null
          potencial_incremental_mensual: number | null
        }
        Relationships: []
      }
      vw_vendedor_performance_cliente: {
        Row: {
          aceleracion_pct: number | null
          cliente_id: number | null
          cliente_nombre: string | null
          grupo_municipio: string | null
          kgs_rolling_12w: number | null
          kgs_rolling_12w_ly: number | null
          kgs_rolling_26w: number | null
          kgs_rolling_26w_ly: number | null
          kgs_rolling_26w_ly_univ: number | null
          kgs_rolling_26w_univ: number | null
          kgs_semana: number | null
          kgs_semana_ly: number | null
          marca_nombre: string | null
          mtd_kgs: number | null
          mtd_kgs_ly: number | null
          mtd_uyu: number | null
          mtd_uyu_ly: number | null
          municipio: string | null
          persona_id: number | null
          persona_nombre: string | null
          q_linea: string | null
          segmento: string | null
          tendencia: string | null
          uyu_neto: number | null
          uyu_neto_ly: number | null
          var_rolling_12w: number | null
          var_rolling_26w: number | null
          var_rolling_26w_univ: number | null
          var_uyu_mtd: number | null
          var_uyu_sem: number | null
          var_uyu_ytd: number | null
          week_start_date: string | null
          ytd_kgs: number | null
          ytd_kgs_ly: number | null
          ytd_uyu: number | null
          ytd_uyu_ly: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_gestion:
        | {
            Args: {
              p_ejecuto?: boolean
              p_estado?: string
              p_gestion_id: number
              p_nota?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_accion_tomada?: string
              p_estado?: string
              p_gestion_id: number
              p_observaciones?: string
              p_resultado?: string
            }
            Returns: undefined
          }
      calcular_mtd_rolling: {
        Args: { semanas_input: string[] }
        Returns: undefined
      }
      crear_acuerdo_desde_gestion: {
        Args: {
          p_descuento_pct?: number
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_gestion_id: number
          p_notas?: string
          p_objetivo_kgs?: number
          p_objetivo_uyu?: number
          p_periodo_semanas?: number
          p_tipo_accion: string
        }
        Returns: number
      }
      crear_gestion_desde_ruta: {
        Args: {
          p_cliente_id: number
          p_fecha_compromiso?: string
          p_persona_id: number
          p_ruta_dia: string
        }
        Returns: number
      }
      fn_auto_cerrar_acuerdos_vencidos: {
        Args: never
        Returns: {
          cerrados: number
          detalle: string
        }[]
      }
      fn_respuesta_chat_vendedor: {
        Args: { p_limit?: number; p_persona_id: number; p_pregunta: string }
        Returns: {
          accion_principal: string
          cliente_id: number
          cliente_nombre: string
          detalle: string
          impacto_estimado: number
          mensaje: string
          orden_prioridad: number
          producto_foco: string
          score_final: number
          tipo_oportunidad: string
          tipo_respuesta: string
        }[]
      }
      fn_vendedor_alertas: {
        Args: { p_persona_id: number }
        Returns: {
          accion_principal: string
          cliente_id: number
          cliente_nombre: string
          orden_prioridad: number
          persona_id: number
          persona_nombre: string
          score_final: number
          semaforo: string
          tipo_oportunidad: string
        }[]
      }
      fn_vendedor_gpt: {
        Args: { p_limit?: number; p_persona_id: number }
        Returns: {
          cliente_id: number
          cliente_nombre: string
          mensaje_principal: string
          orden_prioridad: number
        }[]
      }
      fn_vendedor_top_prioridades: {
        Args: { p_limit?: number; p_persona_id: number }
        Returns: {
          accion_principal: string
          cliente_id: number
          cliente_nombre: string
          orden_prioridad: number
          persona_id: number
          persona_nombre: string
          score_final: number
          semaforo: string
          tipo_oportunidad: string
        }[]
      }
      generar_resumen_gerencia: {
        Args: { p_week_start_date: string }
        Returns: undefined
      }
      get_user_rol: { Args: never; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      pm_fecha_day: { Args: { ts: string }; Returns: string }
      sync_productos_comercial: {
        Args: never
        Returns: {
          categoria_nueva: string
          linea_nueva: string
          marca_nueva: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
