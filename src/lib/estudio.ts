/**
 * estudio.ts · helpers para el expediente: archivos del estudio,
 * revisión humana de la clasificación y orquestación del procesamiento.
 */
import { authedFetch, API_URLS } from './api';

export type EstadoProcesamiento =
  | 'recibido' | 'clasificando' | 'clasificado' | 'extrayendo' | 'procesado' | 'error';
export type EstadoRevision = 'pendiente' | 'aprobado' | 'observado' | 'rechazado';
export type FuenteExtraccion = 'pdf_text' | 'ocr';
export type EstadoOcr = 'no_aplica' | 'pendiente' | 'procesando' | 'listo' | 'error';

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
  estado_procesamiento: EstadoProcesamiento;
  estado_revision: EstadoRevision;
  observacion: string | null;
  fecha_subida: string;
  fecha_actualizacion: string;
  // Decisión OCR del clasificador (migración 008). Pueden no venir en
  // archivos previos a la migración — todos los consumidores usan default.
  requiere_ocr?: boolean;
  razon_ocr?: string | null;
  fuente_extraccion?: FuenteExtraccion;
  estado_ocr?: EstadoOcr;
}

export interface RevisionStats {
  total: number;
  aprobados: number;
  pendientes: number;
  observados: number;
  rechazados: number;
  procesable: boolean;
}

export interface ProcesarResultado {
  folio: string;
  total: number;
  exitosos: number;
  fallidos: number;
  resultados: Array<{ id_archivo: number; nombre: string; ok: boolean; status?: number; error?: string }>;
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

export interface EstudioListItem extends EstudioData {
  // listado puede traer extras: progreso, conteo de archivos, etc.
  total_archivos?: number;
  archivos_procesados?: number;
  avance?: number;
  ultima_actualizacion?: string;
}

export interface ListEstudiosFilter {
  estado?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listEstudios(filter: ListEstudiosFilter = {}): Promise<EstudioListItem[]> {
  const params = new URLSearchParams();
  if (filter.estado) params.set('estado', filter.estado);
  if (filter.search) params.set('search', filter.search);
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await authedFetch(`${API_URLS.estudios}/api-estudios/estudios${qs}`);
  if (!res.ok) throw new Error(`listEstudios ${res.status}`);
  const json = (await res.json()) as { data: EstudioListItem[] };
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

export interface ExtraccionItem {
  id_extraccion: number;
  schema_codigo: string;
  datos: Record<string, unknown>;
  spans: Array<{ field?: string; value?: string; start_char?: number; end_char?: number }> | null;
  confianza: number | null;
  fecha: string;
}

export interface ArchivoConExtracciones extends ArchivoEstudio {
  clasificacion_categoria: string | null;
  clasificacion_emisor: string | null;
  extracciones: ExtraccionItem[];
}

export async function getArchivo(folio: string, fileId: number): Promise<ArchivoConExtracciones> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/archivos/${fileId}`,
  );
  if (!res.ok) throw new Error(`getArchivo ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: ArchivoConExtracciones };
  return json.data;
}

export async function getSignedDownloadUrl(gcsPath: string): Promise<string> {
  const url = `${API_URLS.ingestion}/api-ingestion/upload/signed-download-url?gcs_path=${encodeURIComponent(gcsPath)}`;
  const res = await authedFetch(url);
  if (!res.ok) throw new Error(`getSignedDownloadUrl ${res.status}`);
  const json = (await res.json()) as { data: { download_url: string } };
  return json.data.download_url;
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

export async function procesarEstudio(folio: string): Promise<ProcesarResultado> {
  const res = await authedFetch(
    `${API_URLS.estudios}/api-estudios/estudios/${encodeURIComponent(folio)}/procesar`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`procesarEstudio ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: ProcesarResultado };
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

/* ─────────────────────── OCR transcript ───────────────────────
 *
 * El OCR vive como markdown en un bucket separado (hipotecai-ocr-<env>).
 * La BBDD guarda solo URI + offsets por página + bbox/confidence por línea.
 * Estos helpers exponen esos artefactos al visor para la comparativa
 * PDF original ↔ transcript OCR ↔ extracción.
 */

export interface OcrPagina {
  id_ocr_pagina: number;
  pagina: number;
  /** Offsets dentro del .md OCR — el frontend usa esto para extraer la
   *  sección de cada página sin re-parsear todo el markdown. */
  char_start: number;
  char_end: number;
  confianza_promedio: number | null;
  /** Líneas con bbox + confidence; útil para resaltar baja confianza. */
  lines: Array<{
    text: string;
    bbox: [number, number, number, number] | null;
    confidence: number | null;
  }> | null;
}

export interface OcrDocumentoMeta {
  id_ocr_documento: number;
  id_archivo: number;
  sha256_documento: string;
  modelo: string;
  formato: string;
  gcs_bucket: string;
  gcs_path: string;
  gcs_uri: string;
  bytes: number | null;
  sha256_ocr: string;
  paginas: number | null;
  confianza_promedio: number | null;
  fecha: string;
}

export interface OcrTranscript {
  id_archivo: number;
  documento: OcrDocumentoMeta | null;
  paginas: OcrPagina[];
}

export async function getOcrTranscript(
  idArchivo: number, modelo?: string,
): Promise<OcrTranscript> {
  const qs = modelo ? `?modelo=${encodeURIComponent(modelo)}` : '';
  const res = await authedFetch(
    `${API_URLS.documentos}/archivos/${idArchivo}/ocr${qs}`,
  );
  if (!res.ok) throw new Error(`getOcrTranscript ${res.status}`);
  const json = (await res.json()) as { data: OcrTranscript };
  return json.data;
}

/** Gatilla OCR manualmente para un archivo. Síncrono — el browser espera.
 *
 *  Útil cuando el clasificador no marcó requiere_ocr (PDF con texto nativo
 *  pero el letrado quiere la transcripción) o cuando falló en el flujo
 *  automático. Devuelve el resumen del OCR; el caller debe re-fetchear el
 *  archivo para ver los nuevos campos (estado_ocr='listo', fuente='ocr'). */
export interface OcrManualResult {
  gcs_path: string;
  sha256_documento?: string;
  modelo?: string;
  duracion_ms?: number;
  n_pages?: number;
  skipped?: boolean;
  reason?: string;
}

export async function triggerManualOcr(
  idArchivo: number, gcsPath: string,
): Promise<OcrManualResult> {
  if (!API_URLS.ocr) throw new Error('NEXT_PUBLIC_API_OCR_URL no configurado');
  const res = await authedFetch(`${API_URLS.ocr}/ocr-from-gcs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_archivo: idArchivo, gcs_path: gcsPath }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OCR ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: OcrManualResult };
  return json.data;
}

/** Pide a ocr-api un signed URL al .md y descarga el contenido. */
export async function getOcrMarkdown(gcsUri: string): Promise<string> {
  if (!API_URLS.ocr) throw new Error('NEXT_PUBLIC_API_OCR_URL no configurado');
  const sigRes = await authedFetch(
    `${API_URLS.ocr}/ocr-document-url?gcs_uri=${encodeURIComponent(gcsUri)}`,
  );
  if (!sigRes.ok) throw new Error(`getOcrMarkdown sign ${sigRes.status}`);
  const sigJson = (await sigRes.json()) as { data: { download_url: string } };

  // El .md está en GCS — fetch directo, sin auth (la URL ya está firmada).
  const dlRes = await fetch(sigJson.data.download_url);
  if (!dlRes.ok) throw new Error(`getOcrMarkdown download ${dlRes.status}`);
  return dlRes.text();
}

/* ─────────────────────── Anchors / Evidencia ───────────────────────
 *
 * "Anchor" = vínculo navegable entre un campo extraído y su ubicación en
 * el documento. El extractor genera anchors `origen='auto'` con
 * `estado='propuesto'`; el abogado los confirma/rechaza y puede crear
 * los suyos vía CRUD (migración 010).
 *
 * `EvidenciaItem` se mantiene como alias retrocompat — es lo mismo que
 * `Anchor`. Código nuevo usa Anchor; código viejo (pre-010) sigue
 * funcionando con el alias.
 */

export type AnchorOrigen = 'auto' | 'manual';
export type AnchorEstado = 'propuesto' | 'confirmado' | 'rechazado';

export interface Anchor {
  id_evidencia: number;
  id_extraccion: number;
  id_archivo: number;
  campo: string;
  page: number | null;
  char_start: number | null;
  char_end: number | null;
  snippet: string | null;
  sha256_documento: string;
  confianza: number | null;
  fuente_texto: FuenteExtraccion;
  id_ocr: number | null;
  confianza_ocr: number | null;
  /** Solo cuando fuente_texto='ocr': metadata del documento OCR origen. */
  id_ocr_documento: number | null;
  ocr_modelo: string | null;
  ocr_md_uri: string | null;
  ocr_pagina_char_start: number | null;
  ocr_pagina_char_end: number | null;
  /** Bboxes en PUNTOS PDF — array de [x0, y0, x1, y1]. Una entidad
   *  puede partirse en varias líneas, por eso es lista. NULL cuando
   *  fuente_texto='pdf_text' o evidencia legacy previa a migración 009. */
  bboxes: number[][] | null;
  origen: AnchorOrigen;
  estado: AnchorEstado;
  creado_por: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string | null;
}

/** @deprecated Usar `Anchor`. Mantenido por compat. */
export type EvidenciaItem = Anchor;

export async function listAnchors(
  idExtraccion: number,
  opts: { includeRejected?: boolean } = {},
): Promise<Anchor[]> {
  const qs = opts.includeRejected === false ? '?include_rejected=false' : '';
  const res = await authedFetch(
    `${API_URLS.documentos}/extracciones/${idExtraccion}/anchors${qs}`,
  );
  if (!res.ok) throw new Error(`listAnchors ${res.status}`);
  const json = (await res.json()) as { data: { anchors: Anchor[] } };
  return json.data.anchors;
}

/** @deprecated Usar `listAnchors`. Mantenido por compat con código pre-010. */
export async function getEvidencia(idExtraccion: number): Promise<Anchor[]> {
  return listAnchors(idExtraccion);
}

export interface CreateAnchorInput {
  campo: string;
  page?: number | null;
  char_start?: number | null;
  char_end?: number | null;
  snippet?: string | null;
  fuente_texto?: 'pdf_text' | 'ocr';
  bboxes?: number[][] | null;
  id_ocr?: number | null;
}

export async function createAnchor(
  idExtraccion: number, input: CreateAnchorInput,
): Promise<Anchor> {
  const res = await authedFetch(
    `${API_URLS.documentos}/extracciones/${idExtraccion}/anchors`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error(`createAnchor ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: Anchor };
  return json.data;
}

export interface UpdateAnchorInput {
  campo?: string;
  snippet?: string;
  estado?: AnchorEstado;
  page?: number;
  char_start?: number;
  char_end?: number;
  bboxes?: number[][] | null;
  /** True para poner bboxes a NULL (ej. cambio de OCR a pdf_text). */
  clear_bboxes?: boolean;
}

export async function updateAnchor(
  idAnchor: number, patch: UpdateAnchorInput,
): Promise<Anchor> {
  const res = await authedFetch(
    `${API_URLS.documentos}/anchors/${idAnchor}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw new Error(`updateAnchor ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: Anchor };
  return json.data;
}

export interface DeleteAnchorResult {
  id_anchor: number;
  /** 'deleted' = manual borrado físico; 'rejected' = auto a estado='rechazado'. */
  action: 'deleted' | 'rejected';
}

export async function deleteAnchor(idAnchor: number): Promise<DeleteAnchorResult> {
  const res = await authedFetch(
    `${API_URLS.documentos}/anchors/${idAnchor}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`deleteAnchor ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: DeleteAnchorResult };
  return json.data;
}

/** Confirma un anchor (estado='confirmado'). Shortcut de PATCH. */
export async function confirmAnchor(idAnchor: number): Promise<Anchor> {
  const res = await authedFetch(
    `${API_URLS.documentos}/anchors/${idAnchor}/confirmar`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`confirmAnchor ${res.status}`);
  const json = (await res.json()) as { data: Anchor };
  return json.data;
}

/** Rechaza un anchor (estado='rechazado'). Para los 'auto' es preferible
 *  a DELETE — preserva la auditoría de qué propuso el modelo. */
export async function rejectAnchor(idAnchor: number): Promise<Anchor> {
  const res = await authedFetch(
    `${API_URLS.documentos}/anchors/${idAnchor}/rechazar`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`rejectAnchor ${res.status}`);
  const json = (await res.json()) as { data: Anchor };
  return json.data;
}
