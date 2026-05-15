'use client';

/**
 * /estudios/[folio]/documentos/[id]
 * --------------------------------------------------------------
 * Visor del documento con datos REALES del backend.
 *
 *   1. GET archivo + extracciones (estudios-service)
 *   2. signed-download-url para el PDF (ingestion-service → GCS)
 *   3. Si fuente_extraccion === 'ocr' → carga transcript OCR + evidencia
 *      (documentos-api) y muestra layout de TRES paneles:
 *         PDF original | Transcripción OCR | Panel de extracciones
 *      Si no, layout de DOS paneles (PDF + extracciones).
 *   4. EntityPanel ahora pinta badge "vía OCR" en cada campo cuya
 *      evidencia provino de la transcripción OCR (no del PDF nativo).
 *
 * Header lleva chips con estado_procesamiento y fuente_extraccion para
 * que el letrado vea sin ambigüedad si el documento ya está procesado y
 * de qué fuente vinieron los datos.
 */
import { use, useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, FileSearch, Loader2,
  ScanLine, FileText, Clock, AlertOctagon,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import Chip from '@/components/ui/Chip';
import PDFCanvas, { PAGE_ID_PREFIX } from '@/components/visor/PDFCanvas';
import EntityPanel from '@/components/visor/EntityPanel';
import OcrTranscriptPanel from '@/components/visor/OcrTranscriptPanel';
import {
  getArchivo, getSignedDownloadUrl, getOcrTranscript, getEvidencia,
  triggerManualOcr, reprocesarArchivo,
  type ArchivoConExtracciones, type OcrTranscript, type EvidenciaItem,
  type EstadoProcesamiento,
} from '@/lib/estudio';
import { extraccionesToEntities } from '@/lib/extractionToEntities';

interface PageProps {
  params: Promise<{ folio: string; id: string }>;
}

export default function VisorDocumento({ params }: PageProps) {
  const { folio, id } = use(params);
  const idArchivo = parseInt(id, 10);

  const [archivo, setArchivo] = useState<ArchivoConExtracciones | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [ocr, setOcr] = useState<OcrTranscript | null>(null);
  const [evidencia, setEvidencia] = useState<EvidenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Entities enriquecidas con la evidencia (badge OCR cuando aplica).
  const entities = useMemo(
    () => (archivo ? extraccionesToEntities(archivo.extracciones, evidencia) : []),
    [archivo, evidencia],
  );

  const activeEntity = useMemo(
    () => entities.find((e) => e.id === activeEntityId) ?? null,
    [entities, activeEntityId],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOcr(null);
    setEvidencia([]);

    getArchivo(folio, idArchivo)
      .then(async (a) => {
        if (cancelled) return;
        setArchivo(a);

        // PDF original — siempre se intenta, incluso si aún no se procesó.
        if (a.gcs_path) {
          getSignedDownloadUrl(a.gcs_path)
            .then((url) => { if (!cancelled) setPdfUrl(url); })
            .catch((err: Error) => {
              if (!cancelled) setError(`No se pudo cargar el PDF: ${err.message}`);
            });
        }

        // Transcript OCR — solo si fuente_extraccion='ocr' Y estado='listo'.
        if (a.fuente_extraccion === 'ocr' && a.estado_ocr === 'listo') {
          getOcrTranscript(a.id_archivo)
            .then((t) => { if (!cancelled && t.documento) setOcr(t); })
            .catch((err: Error) => {
              // No bloquea la vista — solo el panel OCR no se muestra.
              console.warn('OCR transcript no disponible:', err.message);
            });
        }

        // Evidencia — una request por extracción. Pocas en práctica
        // (1 archivo → 1 extracción típicamente), así que en serie está bien.
        if (a.extracciones.length > 0) {
          Promise.all(
            a.extracciones.map((ext) =>
              getEvidencia(ext.id_extraccion).catch(() => [] as EvidenciaItem[]),
            ),
          ).then((arrs) => {
            if (!cancelled) setEvidencia(arrs.flat());
          });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [folio, idArchivo]);

  // Cuando se selecciona una entidad, scroll del PDF a su posición.
  const handleEntityFound = useCallback((entityId: string, pageNumber: number, y: number) => {
    if (entityId !== activeEntityId) return;
    const pageEl = document.getElementById(`${PAGE_ID_PREFIX}-${pageNumber}`);
    const scrollEl = pageEl?.closest('.overflow-auto');
    if (!pageEl || !scrollEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const containerRect = scrollEl.getBoundingClientRect();
    const top = pageRect.top - containerRect.top + scrollEl.scrollTop + y - 200;
    scrollEl.scrollTo({ top, behavior: 'smooth' });
  }, [activeEntityId]);

  // Click en highlight del PDF → marca entity activa en el panel.
  const handleEntityClick = useCallback((entityId: string) => {
    setActiveEntityId((prev) => (prev === entityId ? null : entityId));
  }, []);

  // Manual OCR — gatilla ocr-api directamente, y a continuacion
  // re-dispara la extraccion via estudios-service para que langextract
  // procese el .md OCR y persista las evidencias con bboxes. El browser
  // espera ambos pasos secuenciales (~30-90s total, depende de cold-start).
  // Despues refrescamos archivo + transcript + evidencia.
  const handleManualOcr = useCallback(async () => {
    if (!archivo || ocrRunning) return;
    setOcrRunning(true);
    setOcrError(null);
    // Reflejo optimista en el header para que el chip cambie a 'OCR en curso'.
    setArchivo((prev) => prev ? { ...prev, estado_ocr: 'procesando' } : prev);
    try {
      // 1) OCR: Surya sobre el PDF → .md en GCS + dt_ocr_documento/pagina
      await triggerManualOcr(archivo.id_archivo, archivo.gcs_path);

      // 2) Extraccion: langextract sobre el .md del OCR → dt_extraccion +
      //    dt_extraccion_evidencia con bboxes. Solo intenta si el archivo
      //    ya tiene clasificacion + aprobado (requisito del endpoint).
      //    Si falla, no es bloqueante — el panel OCR igual se muestra y
      //    el letrado puede reintentar manualmente con "Reprocesar".
      try {
        await reprocesarArchivo(folio, archivo.id_archivo);
      } catch (extractErr) {
        console.warn('Extraccion post-OCR fallo (no bloqueante):', extractErr);
      }

      // 3) Refrescar archivo + transcript + evidencia con el estado nuevo.
      const fresh = await getArchivo(folio, archivo.id_archivo);
      setArchivo(fresh);
      if (fresh.fuente_extraccion === 'ocr' && fresh.estado_ocr === 'listo') {
        try {
          const t = await getOcrTranscript(fresh.id_archivo);
          if (t.documento) setOcr(t);
        } catch (err) {
          console.warn('OCR transcript no disponible tras manual:', err);
        }
      }
      // Re-fetch de evidencia para que aparezcan los nuevos campos con bboxes.
      if (fresh.extracciones.length > 0) {
        try {
          const arrs = await Promise.all(
            fresh.extracciones.map((ext) =>
              getEvidencia(ext.id_extraccion).catch(() => [] as EvidenciaItem[]),
            ),
          );
          setEvidencia(arrs.flat());
        } catch (err) {
          console.warn('Evidencia no disponible tras manual:', err);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOcrError(msg);
      setArchivo((prev) => prev ? { ...prev, estado_ocr: 'error' } : prev);
    } finally {
      setOcrRunning(false);
    }
  }, [archivo, folio, ocrRunning]);

  const canRunOcr =
    !!archivo && !ocrRunning &&
    archivo.estado_ocr !== 'procesando' &&
    archivo.estado_ocr !== 'listo';

  // Loading inicial
  if (loading && !archivo) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F5EE]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <Loader2 className="w-8 h-8 text-[#A47148] animate-spin" strokeWidth={1.25} />
          <p className="text-[14px] text-[#6B6B6B] mt-4">Cargando documento…</p>
        </main>
      </div>
    );
  }

  // 404
  if (error && !archivo) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F5EE]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <FileSearch className="w-12 h-12 text-[#A47148] mb-4" strokeWidth={1.25} />
          <h1 className="font-serif text-[32px] text-[#0B1F3A] italic">Archivo no encontrado</h1>
          <p className="text-[14px] text-[#3F3F3F] mt-2 max-w-md">{error}</p>
          <Link
            href={`/estudios/${folio}`}
            className="btn-ghost mt-6 inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.14em] rounded-[2px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Volver al expediente
          </Link>
        </main>
      </div>
    );
  }

  if (!archivo) return null;

  const tipoNombre = archivo.clasificacion_nombre || archivo.clasificacion_codigo || 'Sin clasificar';
  const confianza = archivo.clasificacion_confianza ?? 0;
  const showOcrPanel = archivo.fuente_extraccion === 'ocr' && ocr?.documento;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EE]">
      <Navbar />

      {/* Header sticky */}
      <header className="sticky top-[68px] z-30 bg-[#FBF9F2] border-b border-[#E5DFD3]">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={`/estudios/${folio}`}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B] hover:text-[#0B1F3A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Expediente {folio}
          </Link>

          <div className="h-6 w-px bg-[#E5DFD3]" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <Chip tone="navy">{tipoNombre}</Chip>
              <EstadoProcesamientoChip estado={archivo.estado_procesamiento} />
              {archivo.fuente_extraccion === 'ocr' && (
                <FuenteOcrChip estadoOcr={archivo.estado_ocr} razon={archivo.razon_ocr} />
              )}
              {confianza > 0 && (
                <span className="text-[11px] tabular text-[#6B6B6B]">
                  Clasif. <strong className="text-[#0B1F3A]">{Math.round(confianza * 100)}%</strong>
                </span>
              )}
              {entities.length > 0 && (
                <>
                  <span className="text-[11px] tabular text-[#6B6B6B]">·</span>
                  <span className="text-[11px] tabular text-[#6B6B6B]">
                    {entities.length} {entities.length === 1 ? 'entidad' : 'entidades'} reconocidas
                  </span>
                </>
              )}
            </div>
            <h1 className="font-serif text-[20px] text-[#0B1F3A] font-medium truncate">
              {archivo.nombre}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualOcr}
              disabled={!canRunOcr}
              title={
                ocrError
                  ? `Error previo: ${ocrError}`
                  : archivo.estado_ocr === 'listo'
                    ? 'El OCR ya está hecho'
                    : 'Procesa este documento con OCR'
              }
              className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {ocrRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
              ) : (
                <ScanLine className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              {ocrRunning ? 'Procesando OCR…' : 'Procesar OCR'}
            </button>
            <button className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]" disabled>
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} /> Observar
            </button>
            <button className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer" disabled>
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Aprobar extracción
            </button>
          </div>
        </div>
      </header>

      {ocrError && (
        <div className="bg-[#FBE4E4] border-b border-[#E5A8A8] px-6 lg:px-10 py-2 text-[12px] text-[#7E1F1F] flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Error al procesar OCR: {ocrError}</span>
          <button
            onClick={() => setOcrError(null)}
            className="ml-auto text-[11px] uppercase tracking-[0.14em] hover:text-[#5A1414]"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Layout: 2 paneles (PDF + entities) o 3 paneles (PDF + OCR + entities) */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 68px - 73px)' }}>
        <div className="flex-1 min-w-0">
          {pdfUrl ? (
            <PDFCanvas
              fileUrl={pdfUrl}
              entities={entities}
              activeEntityId={activeEntityId}
              onEntityFound={handleEntityFound}
              onEntityClick={handleEntityClick}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-[#1A1A1A] text-[#CAB994] font-serif italic gap-3">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
              Cargando PDF…
            </div>
          )}
        </div>

        {showOcrPanel && ocr?.documento && (
          <div className="w-[480px] flex-shrink-0 hidden xl:block">
            <OcrTranscriptPanel
              documento={ocr.documento}
              paginas={ocr.paginas}
              activeEntity={activeEntity}
            />
          </div>
        )}

        <div className="w-[420px] flex-shrink-0 hidden lg:block">
          <EntityPanel
            entities={entities}
            activeEntityId={activeEntityId}
            onSelect={(id) => setActiveEntityId((prev) => (prev === id ? null : id))}
            documentName={archivo.nombre}
            documentType={tipoNombre}
            confidence={confianza}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Chips de estado para el header ───────────────────── */

function EstadoProcesamientoChip({ estado }: { estado: EstadoProcesamiento }) {
  const cfg = ESTADO_META[estado] ?? ESTADO_META.recibido;
  const Icon = cfg.icon;
  return (
    <span
      title={cfg.tooltip}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase rounded-[2px] border"
      style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
    >
      <Icon className="w-3 h-3" strokeWidth={1.5} /> {cfg.label}
    </span>
  );
}

function FuenteOcrChip({
  estadoOcr, razon,
}: { estadoOcr?: string; razon?: string | null }) {
  const isReady = estadoOcr === 'listo';
  const isError = estadoOcr === 'error';
  const inProgress = estadoOcr === 'pendiente' || estadoOcr === 'procesando';

  let bg = '#FFF4D6';
  let fg = '#7A5A00';
  let border = '#E5C97E';
  let label = 'vía OCR';
  let Icon = ScanLine;

  if (isError) {
    bg = '#FBE4E4'; fg = '#7E1F1F'; border = '#E5A8A8';
    label = 'OCR con error';
    Icon = AlertOctagon;
  } else if (inProgress) {
    bg = '#E8EEF6'; fg = '#0B1F3A'; border = '#B8C5DC';
    label = 'OCR en curso';
    Icon = Clock;
  }

  return (
    <span
      title={razon || (isReady ? 'Texto extraído vía OCR' : '')}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase rounded-[2px] border"
      style={{ background: bg, color: fg, borderColor: border }}
    >
      <Icon className={`w-3 h-3 ${inProgress ? 'animate-pulse' : ''}`} strokeWidth={1.5} /> {label}
    </span>
  );
}

const ESTADO_META: Record<EstadoProcesamiento, {
  label: string;
  bg: string;
  fg: string;
  border: string;
  icon: typeof FileText;
  tooltip: string;
}> = {
  recibido:    { label: 'Subido',       bg: '#F2EEE3', fg: '#6B6B6B', border: '#D9D2C0', icon: FileText, tooltip: 'Documento subido, pendiente de clasificar' },
  clasificando:{ label: 'Clasificando', bg: '#E8EEF6', fg: '#0B1F3A', border: '#B8C5DC', icon: Clock,    tooltip: 'En clasificación automática' },
  clasificado: { label: 'Clasificado',  bg: '#E8F2E8', fg: '#2F5D3C', border: '#B8D8B8', icon: CheckCircle2, tooltip: 'Tipo identificado, pendiente de extracción' },
  extrayendo:  { label: 'Extrayendo',   bg: '#E8EEF6', fg: '#0B1F3A', border: '#B8C5DC', icon: Clock,    tooltip: 'Extrayendo campos con IA' },
  procesado:   { label: 'Procesado',    bg: '#E8F2E8', fg: '#2F5D3C', border: '#B8D8B8', icon: CheckCircle2, tooltip: 'Documento listo para revisión' },
  error:       { label: 'Error',        bg: '#FBE4E4', fg: '#7E1F1F', border: '#E5A8A8', icon: AlertOctagon, tooltip: 'Falló — revisar y reprocesar' },
};
