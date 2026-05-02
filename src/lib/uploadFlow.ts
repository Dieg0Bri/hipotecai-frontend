/**
 * uploadFlow.ts · sube archivos al ingestion-service usando el flujo
 * signed-URL → PUT directo a GCS → confirm.
 *
 *   1. POST /api-ingestion/upload/signed-upload-url  -> { upload_url, gcs_path, headers }
 *   2. PUT  upload_url  con el body del archivo
 *   3. POST /api-ingestion/upload/confirm            -> registra en dt_archivos
 *
 * Eventarc dispara el clasificador automaticamente al detectar el objeto en GCS.
 */
import { authedFetch, API_URLS } from './api';

export interface SignedUploadUrlResponse {
  upload_url: string;
  gcs_path: string;
  gcs_uri: string;
  expires_in: number;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface UploadConfirmResponse {
  archivo: { id: string; nombre: string; gcs_path: string };
  duplicate: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
}

export type UploadStatus = 'pending' | 'uploading' | 'confirming' | 'done' | 'duplicate' | 'failed';

export async function uploadFileToFolio(
  folio: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<UploadConfirmResponse> {
  const mime = file.type || 'application/pdf';

  // 1. Pedir URL firmada
  const signedRes = await authedFetch(`${API_URLS.ingestion}/api-ingestion/upload/signed-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folio, filename: file.name, mime_type: mime }),
  });
  if (!signedRes.ok) {
    throw new Error(`signed-upload-url ${signedRes.status}: ${await signedRes.text()}`);
  }
  const signedJson = (await signedRes.json()) as { data: SignedUploadUrlResponse };
  const { upload_url, gcs_path, headers } = signedJson.data;

  // 2. PUT directo a GCS — XHR para tener progreso real
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload_url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) onProgress({ loaded: ev.loaded, total: ev.total });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`GCS PUT ${xhr.status}: ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error('GCS PUT network error'));
    xhr.send(file);
  });

  // 3. Confirmar en ingestion-service
  const confirmRes = await authedFetch(`${API_URLS.ingestion}/api-ingestion/upload/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folio,
      gcs_path,
      nombre: file.name,
      mime_type: mime,
      size_bytes: file.size,
    }),
  });
  if (!confirmRes.ok) {
    throw new Error(`upload/confirm ${confirmRes.status}: ${await confirmRes.text()}`);
  }
  const confirmJson = (await confirmRes.json()) as { data: UploadConfirmResponse };
  return confirmJson.data;
}

export interface CreateEstudioInput {
  rol_sii: string;
  direccion: string;
  comuna: string;
  region?: string;
  cliente?: string;
  encargo?: string;
  plazo_dias?: number;
}

export interface CreateEstudioResponse {
  folio: string;
  estado: string;
}

export async function createEstudio(input: CreateEstudioInput): Promise<CreateEstudioResponse> {
  const res = await authedFetch(`${API_URLS.estudios}/api-estudios/estudios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`createEstudio ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data: CreateEstudioResponse };
  return json.data;
}
