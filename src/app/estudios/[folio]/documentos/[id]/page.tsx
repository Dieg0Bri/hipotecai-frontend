'use client';

/**
 * /estudios/[folio]/documentos/[id]
 * --------------------------------------------------------------
 * Visor del documento individual con reconocimiento de entidades.
 * Layout en dos columnas:
 *   Izquierda  → PDFCanvas (react-pdf con highlights por entidad)
 *   Derecha    → EntityPanel (lista agrupada por categoría legal)
 *
 * Click en una entidad del panel → marca activa, dispara scroll en
 * el PDF y se resalta más fuerte.
 */
import { use, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, FileSearch, MoreHorizontal } from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import PDFCanvas, { PAGE_ID_PREFIX } from '@/components/visor/PDFCanvas';
import EntityPanel from '@/components/visor/EntityPanel';
import Chip from '@/components/ui/Chip';

import { ARCHIVOS_MOCK } from '@/data/mock-estudio';
import { ENTITIES_BY_ARCHIVO } from '@/data/mock-entities';
import { generatePdfBlobUrl } from '@/lib/pdfGenerator';

interface PageProps {
  params: Promise<{ folio: string; id: string }>;
}

export default function VisorDocumento({ params }: PageProps) {
  const { folio, id } = use(params);
  const idArchivo = parseInt(id, 10);

  const archivo = useMemo(() => ARCHIVOS_MOCK.find((a) => a.id_archivo === idArchivo), [idArchivo]);
  const entities = useMemo(() => ENTITIES_BY_ARCHIVO[idArchivo] ?? [], [idArchivo]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

  // Generar PDF sintético al montar (en cliente, evita SSR)
  useEffect(() => {
    if (!archivo) return;
    const url = generatePdfBlobUrl(archivo);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cuando el highlight notifica posición, scroll del contenedor del PDF a esa Y
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

  // Click en un highlight del PDF → marca activa la entidad en el panel
  const handleEntityClick = useCallback((entityId: string) => {
    setActiveEntityId((prev) => (prev === entityId ? null : entityId));
  }, []);

  // 404
  if (!archivo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F5EE]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <FileSearch className="w-12 h-12 text-[#A47148] mb-4" strokeWidth={1.25} />
          <h1 className="font-serif text-[32px] text-[#0B1F3A] italic">Archivo no encontrado</h1>
          <p className="text-[14px] text-[#3F3F3F] mt-2 max-w-md">
            El archivo {idArchivo} no aparece en el expediente {folio}.
          </p>
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EE]">
      <Navbar />

      {/* Header del documento (sticky) */}
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
            <div className="flex items-center gap-2 mb-0.5">
              <Chip tone="navy">{archivo.tipo_nombre}</Chip>
              {archivo.confianza > 0 && (
                <span className="text-[11px] tabular text-[#6B6B6B]">
                  Confianza langextract <strong className="text-[#0B1F3A]">{Math.round(archivo.confianza * 100)}%</strong>
                </span>
              )}
              <span className="text-[11px] tabular text-[#6B6B6B]">·</span>
              <span className="text-[11px] tabular text-[#6B6B6B]">
                {entities.length} entidades reconocidas
              </span>
            </div>
            <h1 className="font-serif text-[20px] text-[#0B1F3A] font-medium truncate">
              {archivo.nombre}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px]">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} /> Observar
            </button>
            <button className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] rounded-[2px] cursor-pointer">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Aprobar extracción
            </button>
            <button className="p-2 text-[#6B6B6B] hover:text-[#0B1F3A] hover:bg-[#F8F5EE] rounded-[2px]">
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Layout dos columnas */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 68px - 73px)' }}>
        {/* PDF (izquierda) */}
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
            <div className="h-full flex items-center justify-center bg-[#1A1A1A] text-[#CAB994] font-serif italic">
              Generando documento…
            </div>
          )}
        </div>

        {/* Panel de entidades (derecha) */}
        <div className="w-[420px] flex-shrink-0 hidden lg:block">
          <EntityPanel
            entities={entities}
            activeEntityId={activeEntityId}
            onSelect={(id) => setActiveEntityId(id === activeEntityId ? null : id)}
            documentName={archivo.nombre}
            documentType={archivo.tipo_nombre}
            confidence={archivo.confianza}
          />
        </div>
      </div>
    </div>
  );
}
