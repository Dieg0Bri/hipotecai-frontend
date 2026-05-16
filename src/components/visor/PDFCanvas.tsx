'use client';

/**
 * PDFCanvas · visualizador react-pdf con controles + entity highlights
 * --------------------------------------------------------------
 * - Carga react-pdf dinámicamente (sin SSR) igual que ISA1.
 * - Renderiza todas las páginas en un scroll vertical.
 * - Sobrepone EntityHighlight encima del text-layer de cada página.
 * - Expone callback para hacer scroll cuando el usuario clickea una
 *   entidad en el panel.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ZoomIn, ZoomOut, Maximize2, Search, X, Plus } from 'lucide-react';

// Estilos del text layer de pdf.js — sin esto el highlight no encuentra spans
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

import EntityHighlight from './EntityHighlight';
import BboxHighlight from './BboxHighlight';
import LeaderLine from './LeaderLine';
import RectDrawer from './RectDrawer';
import FieldPickerModal, { type FieldOption } from './FieldPickerModal';
import { useAnchorDraft } from './useAnchorDraft';
import type { Entity } from '@/data/entities';

const Document = dynamic(() => import('react-pdf').then((m) => m.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((m) => m.Page), { ssr: false });

// Configurar pdf.js worker en el cliente
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  import('react-pdf').then((mod) => {
    mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

interface Props {
  fileUrl: string;
  entities: Entity[];
  activeEntityId: string | null;
  onEntityFound?: (entityId: string, pageNumber: number, y: number) => void;
  /** Click sobre un highlight del PDF → selecciona la entidad en el panel */
  onEntityClick?: (entityId: string) => void;
  /** Habilita el modo "agregar anchor manual". Si se pasan ambos callbacks,
   *  aparece el botón "+ Anchor" en la toolbar. El padre debe proveer:
   *  - availableFields: las opciones para el modal de elegir campo (deduce
   *    de las Entity actuales en la mayoría de casos)
   *  - onCreateAnchor: hace POST createAnchor y actualiza el estado de
   *    anchors. Se llama después de que el usuario eligió el campo. */
  availableFields?: FieldOption[];
  onCreateAnchor?: (input: {
    campo: string;
    page: number;
    snippet: string | null;
    fuente_texto: 'pdf_text' | 'ocr';
    bboxes: number[][];
  }) => Promise<void> | void;
}

const PAGE_ID_PREFIX = 'expediente-page';

export default function PDFCanvas({
  fileUrl, entities, activeEntityId, onEntityFound, onEntityClick,
  availableFields, onCreateAnchor,
}: Props) {
  // Modo "agregar anchor manual": ver useAnchorDraft.ts. Solo se activa si
  // el padre proveyó onCreateAnchor — sin eso el botón ni se muestra.
  const anchorDraft = useAnchorDraft();
  const canAddAnchor = !!onCreateAnchor;
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scale, setScale] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Dimensiones de cada pagina en PUNTOS PDF (1/72"). Las capturamos en
  // onLoadSuccess de react-pdf y se las pasamos a BboxHighlight para
  // mapear coords de las bboxes (en pt) a CSS px.
  const [pagePtSizes, setPagePtSizes] = useState<Record<number, { ptWidth: number; ptHeight: number }>>({});
  // Ancho CSS real de cada pagina renderizada. Cuando zoom != 1 o el
  // contenedor cambia, este valor varia. Lo medimos con ResizeObserver
  // sobre el div de la pagina.
  const [pageCssWidths, setPageCssWidths] = useState<Record<number, number>>({});
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Resize observer para ajustar el ancho de las páginas
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      setContainerWidth(Math.max(0, w - 32));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => setNumPages(n);

  // Captura el tamaño real de la pagina en puntos PDF cuando react-pdf la
  // carga. `page.view = [x0, y0, x1, y1]` en pdf units (= puntos).
  // Origen bottom-left en PDF pero solo usamos el delta (width/height),
  // que es invariante al origen.
  const handlePageLoadSuccess = useCallback(
    (pageNumber: number, page: { view: [number, number, number, number] }) => {
      const ptWidth = page.view[2] - page.view[0];
      const ptHeight = page.view[3] - page.view[1];
      setPagePtSizes((prev) => (
        prev[pageNumber]?.ptWidth === ptWidth ? prev : { ...prev, [pageNumber]: { ptWidth, ptHeight } }
      ));
    },
    [],
  );

  // ResizeObserver sobre cada pagina para tener el ancho CSS real cuando
  // hay zoom o el contenedor cambia.
  useEffect(() => {
    if (numPages === 0) return;
    const observers: ResizeObserver[] = [];
    pageRefs.current.forEach((el, pageNumber) => {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          setPageCssWidths((prev) => (prev[pageNumber] === w ? prev : { ...prev, [pageNumber]: w }));
        }
      });
      ro.observe(el);
      observers.push(ro);
    });
    return () => observers.forEach((ro) => ro.disconnect());
  }, [numPages, scale, zoomed, containerWidth]);

  // Captura selección de texto sobre el text-layer cuando el modo "agregar
  // anchor" está activo. Se dispara en mouseup global (el dragging completa
  // ahí) y filtra: solo cuando la selección está dentro de un span del
  // text-layer de alguna página renderizada.
  useEffect(() => {
    if (!anchorDraft.active) return;
    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const startEl = (range.startContainer.parentElement
        ?? (range.startContainer as Element));
      if (!startEl?.closest?.('.react-pdf__Page__textContent')) return;
      const pageEl = (startEl as Element).closest('[id^="expediente-page-"]') as HTMLElement | null;
      if (!pageEl) return;
      const m = pageEl.id.match(/-(\d+)$/);
      if (!m) return;
      const pageNumber = parseInt(m[1], 10);
      const widthPt = pagePtSizes[pageNumber]?.ptWidth;
      const cssWidth = pageCssWidths[pageNumber];
      if (!widthPt || !cssWidth) return;
      const scale = widthPt / cssWidth;
      const pageRect = pageEl.getBoundingClientRect();
      const bboxes = Array.from(range.getClientRects())
        .filter((r) => r.width > 0 && r.height > 0)
        .map<[number, number, number, number]>((r) => [
          (r.left - pageRect.left) * scale,
          (r.top - pageRect.top) * scale,
          (r.right - pageRect.left) * scale,
          (r.bottom - pageRect.top) * scale,
        ]);
      if (bboxes.length === 0) return;
      anchorDraft.capture({
        page: pageNumber,
        snippet: sel.toString().trim(),
        bboxes,
        fuente_texto: 'pdf_text',
      });
      sel.removeAllRanges();
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [anchorDraft, pagePtSizes, pageCssWidths]);

  // Si el padre eliminó el callback (ej. el archivo no tiene id_extraccion
  // todavía), forzamos salir del modo.
  useEffect(() => {
    if (!canAddAnchor && anchorDraft.active) anchorDraft.exit();
  }, [canAddAnchor, anchorDraft]);

  const handleConfirmField = useCallback(async (campo: string) => {
    if (!anchorDraft.draft || !onCreateAnchor) return;
    const d = anchorDraft.draft;
    await onCreateAnchor({
      campo,
      page: d.page,
      snippet: d.snippet || null,
      fuente_texto: d.fuente_texto,
      bboxes: d.bboxes,
    });
    // Tras un POST exitoso salimos del modo completo — si el abogado quiere
    // agregar otro, vuelve a activar el toggle.
    anchorDraft.exit();
  }, [anchorDraft, onCreateAnchor]);

  const handleHighlightPosition = useCallback(
    (entityId: string, pageNumber: number, y: number) => {
      onEntityFound?.(entityId, pageNumber, y);
    },
    [onEntityFound]
  );

  // Búsqueda local pseudo-entity (genera entidades temporales para el highlight)
  const searchEntity: Entity[] = searchQuery
    ? [
        {
          id: '__search__',
          class: 'busqueda',
          text: searchQuery,
          label: 'Búsqueda',
          category: 'otro',
        },
      ]
    : [];

  const allEntities = [...entities, ...searchEntity];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1A1A1A]">
      {/* Search bar */}
      {searchOpen && (
        <div className="bg-[#0B1F3A] border-b border-[#2C3E5C] px-4 py-2 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#CAB994]" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar texto en el documento…"
            className="flex-1 bg-transparent text-[#F8F5EE] placeholder:text-[#6B6B6B] text-[13px] focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#CAB994] hover:text-white">
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            className="text-[12px] uppercase tracking-[0.14em] text-[#CAB994] hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Floating zoom controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 bg-[#0B1F3A] rounded-[2px] p-1 shadow-lg">
        <button onClick={() => { setZoomed(true); setScale((s) => Math.min(s + 0.25, 3)); }} className="p-2 hover:bg-[#16315A] rounded-[2px]" aria-label="Acercar">
          <ZoomIn className="w-4 h-4 text-[#CAB994]" strokeWidth={1.5} />
        </button>
        <button onClick={() => { setZoomed(true); setScale((s) => Math.max(s - 0.25, 0.5)); }} className="p-2 hover:bg-[#16315A] rounded-[2px]" aria-label="Alejar">
          <ZoomOut className="w-4 h-4 text-[#CAB994]" strokeWidth={1.5} />
        </button>
        <button onClick={() => { setZoomed(false); setScale(1); }} className="p-2 hover:bg-[#16315A] rounded-[2px]" aria-label="Ajustar al ancho">
          <Maximize2 className="w-4 h-4 text-[#CAB994]" strokeWidth={1.5} />
        </button>
        <div className="h-px bg-[#2C3E5C] my-0.5" />
        <button onClick={() => setSearchOpen((v) => !v)} className={`p-2 rounded-[2px] ${searchOpen ? 'bg-[#A47148]' : 'hover:bg-[#16315A]'}`} aria-label="Buscar">
          <Search className="w-4 h-4 text-[#F8F5EE]" strokeWidth={1.5} />
        </button>
        {canAddAnchor && (
          <button
            onClick={() => anchorDraft.active ? anchorDraft.exit() : anchorDraft.start()}
            className={`p-2 rounded-[2px] ${anchorDraft.active ? 'bg-[#A47148]' : 'hover:bg-[#16315A]'}`}
            aria-label={anchorDraft.active ? 'Cancelar agregar anchor' : 'Agregar anchor manual'}
            title={anchorDraft.active
              ? 'Cancelar: salir del modo agregar anchor'
              : 'Agregar anchor: seleccioná texto o dibujá un rect sobre el documento'}
          >
            <Plus className="w-4 h-4 text-[#F8F5EE]" strokeWidth={1.5} />
          </button>
        )}
        <div className="text-[10px] tabular text-center text-[#CAB994] mt-1 px-1">
          {zoomed ? `${Math.round(scale * 100)}%` : 'Ajus.'}
        </div>
      </div>

      {/* Banner instructivo cuando el modo agregar anchor está activo. Vive
          sobre el documento, no sobre la toolbar, para que el abogado lo
          vea sin perder el foco del PDF. */}
      {anchorDraft.active && !anchorDraft.draft && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#0B1F3A] text-[#F8F5EE] text-[12px] rounded-[2px] shadow-lg flex items-center gap-2">
          <span className="smallcaps text-[#CAB994]">Modo agregar</span>
          <span>·</span>
          <span>Seleccioná texto o dibujá un rectángulo</span>
          <button
            onClick={anchorDraft.exit}
            className="ml-2 text-[#CAB994] hover:text-white"
            aria-label="Salir del modo"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Document */}
      <div ref={containerRef} className="flex-1 overflow-auto p-6">
        <div
          className="flex flex-col gap-6 mx-auto"
          style={{
            minWidth: zoomed ? 'max-content' : '100%',
            width: zoomed ? 'auto' : 'fit-content',
          }}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onLoadSuccess}
            loading={<DocumentLoader />}
            error={
              <div className="text-[#CAB994] p-12 text-center font-serif italic">
                No se pudo cargar el documento.
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <div
                  key={`pg-${pageNumber}`}
                  id={`${PAGE_ID_PREFIX}-${pageNumber}`}
                  className="relative shadow-xl"
                  style={{ background: 'white' }}
                  ref={(el) => {
                    if (el) pageRefs.current.set(pageNumber, el);
                    else pageRefs.current.delete(pageNumber);
                  }}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={zoomed ? scale : undefined}
                    width={zoomed ? undefined : containerWidth || undefined}
                    renderTextLayer
                    renderAnnotationLayer={false}
                    onLoadSuccess={(page) => handlePageLoadSuccess(pageNumber, page as unknown as { view: [number, number, number, number] })}
                  />
                  <EntityHighlight
                    pageNumber={pageNumber}
                    pageIdPrefix={PAGE_ID_PREFIX}
                    entities={allEntities}
                    activeEntityId={activeEntityId}
                    onHighlightPosition={handleHighlightPosition}
                    onEntityClick={onEntityClick}
                  />
                  <BboxHighlight
                    pageNumber={pageNumber}
                    entities={allEntities}
                    activeEntityId={activeEntityId}
                    pageWidthPt={pagePtSizes[pageNumber]?.ptWidth}
                    pageCssWidth={pageCssWidths[pageNumber]}
                    onEntityClick={onEntityClick}
                    onHighlightPosition={handleHighlightPosition}
                  />
                  <RectDrawer
                    pageNumber={pageNumber}
                    pageWidthPt={pagePtSizes[pageNumber]?.ptWidth}
                    pageCssWidth={pageCssWidths[pageNumber]}
                    enabled={anchorDraft.active}
                    onCapture={({ page, bbox, snippet }) => {
                      anchorDraft.capture({
                        page,
                        snippet,
                        bboxes: [bbox],
                        // Rect dibujado a mano → marcamos como 'ocr' para
                        // ser consistentes con anchors que vienen de OCR.
                        // Si la página era pdf_text, el abogado pudo haber
                        // usado selección de texto en lugar de dibujar.
                        fuente_texto: 'ocr',
                      });
                    }}
                  />
                </div>
              );
            })}
          </Document>
        </div>
      </div>

      {/* Línea de conexión bbox ↔ panel. Vive a nivel de viewport para que
          su sistema de coordenadas no dependa del scroll del PDF. */}
      <LeaderLine activeEntityId={activeEntityId} />

      {/* Modal de elección de campo cuando hay un draft pendiente. */}
      {anchorDraft.draft && onCreateAnchor && (
        <FieldPickerModal
          snippet={anchorDraft.draft.snippet}
          page={anchorDraft.draft.page}
          fuenteTexto={anchorDraft.draft.fuente_texto}
          fields={availableFields ?? []}
          onCancel={anchorDraft.dismissDraft}
          onConfirm={handleConfirmField}
        />
      )}
    </div>
  );
}

function DocumentLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-[#CAB994]">
      <Loader2 className="w-6 h-6 animate-spin mb-3" strokeWidth={1.5} />
      <p className="font-serif italic text-[14px]">Cargando documento…</p>
    </div>
  );
}

export { PAGE_ID_PREFIX };
