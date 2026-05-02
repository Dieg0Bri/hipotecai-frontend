/**
 * catalogo.ts · acceso al catálogo de tipos de documento + documentos solicitados.
 * Consume estudios-service.
 */
import { authedFetch, API_URLS } from './api';

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  tipo_categoria: 'base' | 'condicional';
  emisor: string | null;
  vigencia_dias: number | null;
  orden: number;
  requiere_plano: boolean;
}

export interface DocumentoSolicitado {
  id_solicitud: number;
  trigger_id: string;
  motivo: string;
  matched_phrase: string | null;
  estado: 'pendiente' | 'subido' | 'descartado';
  fecha_creacion: string;
  fecha_resolucion: string | null;
  codigo_solicitado: string;
  nombre_solicitado: string;
  categoria: string | null;
  emisor: string | null;
  id_archivo_origen: number | null;
  nombre_archivo_origen: string | null;
  id_archivo_resuelto: number | null;
  nombre_archivo_resuelto: string | null;
}

export async function listClasificaciones(filter?: {
  tipo?: 'base' | 'condicional';
  categoria?: string;
}): Promise<TipoDocumento[]> {
  const params = new URLSearchParams();
  if (filter?.tipo) params.set('tipo', filter.tipo);
  if (filter?.categoria) params.set('categoria', filter.categoria);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await authedFetch(`${API_URLS.estudios}/api-estudios/catalogos/clasificaciones${qs}`);
  if (!res.ok) throw new Error(`listClasificaciones ${res.status}`);
  const json = (await res.json()) as { data: TipoDocumento[] };
  return json.data;
}

export async function listDocumentosSolicitados(folio: string): Promise<DocumentoSolicitado[]> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/documentos-solicitados`,
  );
  if (!res.ok) throw new Error(`listDocumentosSolicitados ${res.status}`);
  const json = (await res.json()) as { data: DocumentoSolicitado[] };
  return json.data;
}

export async function updateSolicitudEstado(
  folio: string,
  idSolicitud: number,
  estado: 'pendiente' | 'subido' | 'descartado',
  idArchivoResuelto?: number,
): Promise<DocumentoSolicitado> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/documentos-solicitados/${idSolicitud}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, id_archivo_resuelto: idArchivoResuelto }),
    },
  );
  if (!res.ok) throw new Error(`updateSolicitudEstado ${res.status}`);
  const json = (await res.json()) as { data: DocumentoSolicitado };
  return json.data;
}
