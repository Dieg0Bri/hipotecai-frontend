'use client';

/**
 * /estudios/[folio]/documentos/[id]
 * --------------------------------------------------------------
 * Visor con datos REALES del backend + highlights de extracciones:
 *
 *   1. GET archivo + extracciones (estudios-service)
 *   2. signed-download-url para el PDF (ingestion-service → GCS)
 *   3. Convierte extracciones JSONB a Entity[] (extractionToEntities)
 *   4. PDFCanvas renderiza el PDF con react-pdf y EntityHighlight
 *      busca cada `text` en el text-layer del pdf.js → overlay con
 *      highlights por categoría legal
 *
 * Click bidireccional:
 *   · Click en panel → marca activa la entidad → PDF la resalta más fuerte y scroll
 *   · Click en highlight del PDF → marca activa la entidad → panel hace scroll
 */
import { use, useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, FileSearch, Loader2,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import Chip from '@/components/ui/Chip';
import PDFCanvas, { PAGE_ID_PREFIX } from '@/components/visor/PDFCanvas';
import EntityPanel from '@/components/visor/EntityPanel';
import {
  getArchivo, getSignedDownloadUrl, type ArchivoConExtracciones,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

  // Memo: los Entity[] derivados de las extracciones reales para el visor
  const entities = useMemo(
    () => (archivo ? extraccionesToEntities(archivo.extracciones) : []),
    [archivo],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getArchivo(folio, idArchivo)
      .then(async (a) => {
        if (cancelled) return;
        setArchivo(a);
        if (a.gcs_path) {
          try {
            const url = await getSignedDownloadUrl(a.gcs_path);
            if (!cancelled) setPdfUrl(url);
          } catch (err) {
            if (!cancelled) setError(`No se pudo cargar el PDF: ${(err as Error).message}`);
          }
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

  // Cuando se selecciona una entidad, scroll del PDF a su posición
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

  // Click en highlight del PDF → marca entity activa en el panel
  const handleEntityClick = useCallback((entityId: string) => {
    setActiveEntityId((prev) => (prev === entityId ? null : entityId));
  }, []);

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
            <button className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]" disabled>
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} /> Observar
            </button>
            <button className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer" disabled>
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Aprobar extracción
            </button>
          </div>
        </div>
      </header>

      {/* Layout dos columnas */}
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
