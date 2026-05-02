/**
 * estudio.ts · helpers para el expediente: archivos del estudio,
 * revisión humana de la clasificación y orquestación del procesamiento.
 */
import { authedFetch, API_URLS } from './api';

export interface ArchivoEstudio {
  id_archivo: number;
  nombre: string;
  gcs_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  id_clasificacion: number | null;
  clasificacion_codigo: string | null;
  clasificacion_nombre: string | null;
  clasificacion_confianza: number | null;
  estado_procesamiento: 'recibido' | 'clasificando' | 'clasificado' | 'extrayendo' | 'procesado' | 'error';
  estado_revision: 'pendiente' | 'aprobado' | 'observado' | 'rechazado';
  observacion: string | null;
  fecha_subida: string;
  fecha_actualizacion: string;
}

export interface RevisionStats {
  total: number;
  aprobados: number;
  pendientes: number;
  observados: number;
  rechazados: number;
  procesable: boolean;
}

// El endpoint /procesar ahora responde 202 + un payload con cuántos archivos
// se enviaron al loop background. Frontend hace polling para ver el progreso.
export interface ProcesarIniciado {
  folio: string;
  total: number;
  mensaje: string;
}

export interface EstudioData {
  id_estudio: number;
  folio: string;
  rol_sii: string;
  direccion: string;
  comuna: string;
  region: string | null;
  encargo: string | null;
  plazo_dias: number | null;
  fecha_apertura: string;
  fecha_creacion: string;
  estado_codigo: string | null;
  estado_nombre: string | null;
  cliente_nombre: string | null;
}

export async function getEstudio(folio: string): Promise<EstudioData> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}`,
  );
  if (!res.ok) throw new Error(`getEstudio ${res.status}`);
  const json = (await res.json()) as { data: EstudioData };
  return json.data;
}

export async function listArchivos(folio: string): Promise<ArchivoEstudio[]> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/archivos`,
  );
  if (!res.ok) throw new Error(`listArchivos ${res.status}`);
  const json = (await res.json()) as { data: ArchivoEstudio[] };
  return json.data;
}

export async function updateArchivoMetadata(
  folio: string,
  fileId: number,
  patch: Partial<{
    id_clasificacion: number;
    estado_revision: 'pendiente' | 'aprobado' | 'observado' | 'rechazado';
    observacion: string;
  }>,
): Promise<ArchivoEstudio> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/archivos/${fileId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw new Error(`updateArchivo ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: ArchivoEstudio };
  return json.data;
}

export async function getRevisionStats(folio: string): Promise<RevisionStats> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/revision-stats`,
  );
  if (!res.ok) throw new Error(`getRevisionStats ${res.status}`);
  const json = (await res.json()) as { data: RevisionStats };
  return json.data;
}

export async function procesarEstudio(folio: string): Promise<ProcesarIniciado> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/procesar`,
    { method: 'POST' },
  );
  // 202 = aceptado, corriendo en background; 200 = nada nuevo para procesar.
  if (!res.ok) throw new Error(`procesarEstudio ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: ProcesarIniciado };
  return json.data;
}

// Reprocesa UN archivo. Útil si la extracción falló o se cambió el tipo.
export interface ReprocesarResultado {
  id_archivo: number;
  nombre: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export async function reprocesarArchivo(folio: string, fileId: number): Promise<ReprocesarResultado> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/archivos/${fileId}/procesar`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`reprocesarArchivo ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: ReprocesarResultado };
  return json.data;
}
