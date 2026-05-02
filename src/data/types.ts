/**
 * Tipos compartidos del dominio hipotecai.
 * Coinciden 1:1 con el schema de migrations/001_init.sql.
 */

export type EstadoEstudio = 'borrador' | 'en_analisis' | 'observado' | 'verificado' | 'archivado';

export type TipoDocumento =
  | 'escritura'
  | 'cert_dominio_vigente'
  | 'cert_hipotecas_gravamenes'
  | 'cert_avaluo_sii'
  | 'cert_municipal'
  | 'plano_propiedad'
  | 'plan_regulador'
  | 'otro';

export type EstadoProcesamiento = 'recibido' | 'clasificando' | 'clasificado' | 'extrayendo' | 'procesado' | 'error';
export type EstadoRevision = 'pendiente' | 'aprobado' | 'observado' | 'rechazado';

export type SeveridadHallazgo = 'critica' | 'alta' | 'media' | 'baja' | 'info';
export type EstadoHallazgo = 'abierto' | 'en_revision' | 'resuelto' | 'descartado';

export interface Estudio {
  folio: string;
  rol_sii: string;
  direccion: string;
  comuna: string;
  region: string;
  encargo?: string;
  plazo_dias: number;
  estado: EstadoEstudio;
  cliente_nombre: string;
  cliente_tipo: 'banco' | 'mutuaria' | 'inmobiliaria' | 'particular' | 'otro';
  email_letrado: string;
  letrado_nombre: string;
  fecha_apertura: string;
  fecha_creacion: string;
}

export interface Span {
  field: string;
  value: string;
  start_char?: number;
  end_char?: number;
}

export interface Archivo {
  id_archivo: number;
  nombre: string;
  tipo: TipoDocumento;
  tipo_nombre: string;
  estado_procesamiento: EstadoProcesamiento;
  estado_revision: EstadoRevision;
  fecha_subida: string;
  size_bytes: number;
  confianza: number;
  extraccion?: Record<string, unknown>;
  spans?: Span[];
}

export interface SintesisCard {
  source: TipoDocumento | 'ninguna';
  label: string;
  fecha_emision?: string | null;
  campos: { key: string; label: string; value: string | number | boolean | null }[];
  warning?: string;
}

export interface Hallazgo {
  id_hallazgo: number;
  regla_id: string;
  severidad: SeveridadHallazgo;
  titulo: string;
  descripcion: string;
  detalle?: Record<string, unknown>;
  recomendacion?: string;
  estado: EstadoHallazgo;
  fecha: string;
}

export interface SintesisResumen {
  cobertura_pct: number;
  schemas_presentes: TipoDocumento[];
  schemas_faltantes: TipoDocumento[];
  n_incongruencias: number;
}
