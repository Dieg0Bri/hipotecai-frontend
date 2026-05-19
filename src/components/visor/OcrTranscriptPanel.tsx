'use client';

/**
 * OcrTranscriptPanel · panel central que muestra la transcripción OCR
 * --------------------------------------------------------------
 * Aparece en el visor SOLO cuando `archivo.fuente_extraccion === 'ocr'`,
 * entre el PDF original (izq) y el panel de entities (der).
 *
 * Carga el `.md` desde el bucket OCR vía signed URL y lo segmenta por
 * página usando los offsets que persistió ocr-api en `dt_ocr_pagina`.
 *
 * Cuando hay una entity activa, busca su texto literal dentro de la
 * página correspondiente y lo resalta con <mark>. También hace scroll
 * automático a esa página.
 *
 * IMPORTANTE: el OCR es un MODELO, no el documento. La cabecera lleva
 * disclaimer visible y cada línea baja en confianza es indicada visualmente.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Loader2, ScanLine, AlertTriangle } from 'lucide-react';

import {
  getOcrMarkdown, type OcrPagina, type OcrDocumentoMeta,
} from '@/lib/estudio';
import type { Entity } from '@/data/entities';

interface Props {
  documento: OcrDocumentoMeta;
  paginas: OcrPagina[];
  /** Entity actualmente seleccionada — si su texto está en alguna página, se resalta. */
  activeEntity: Entity | null;
}

const PAGE_ID_PREFIX = 'ocr-page';

export default function OcrTranscriptPanel({ documento, paginas, activeEntity }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Descarga el .md vía signed URL una sola vez (cambia solo si cambia gcs_uri).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOcrMarkdown(documento.gcs_uri)
      .then((md) => { if (!cancelled) setMarkdown(md); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [documento.gcs_uri]);

  // Segmentación por página usando los offsets persistidos. Cada página
  // queda como un slice del markdown — más rápido y robusto que parsear.
  const pageBlocks = useMemo(() => {
    if (!markdown) return [];
    return paginas.map((p) => ({
      ...p,
      texto: markdown.slice(p.char_start, p.char_end),
    }));
  }, [markdown, paginas]);

  // Scroll a la página de la entity activa cuando cambia.
  useEffect(() => {
    if (!activeEntity?.pagina) return;
    const el = document.getElementById(`${PAGE_ID_PREFIX}-${activeEntity.pagina}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeEntity]);

  if (loading) {
    return (
      <aside className="h-full flex flex-col items-center justify-center bg-[#FBF9F2] border-l border-[#E5DFD3] text-[#6B6B6B] gap-2">
        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
        <p className="text-[12px] font-serif italic">Cargando transcripción OCR…</p>
      </aside>
    );
  }
  if (error) {
    return (
      <aside className="h-full flex flex-col items-center justify-center bg-[#FBF9F2] border-l border-[#E5DFD3] text-[#7E1F1F] gap-2 px-6 text-center">
        <AlertTriangle className="w-6 h-6" strokeWidth={1.5} />
        <p className="text-[12px]">No se pudo cargar la transcripción OCR</p>
        <p className="text-[11px] text-[#6B6B6B]">{error}</p>
      </aside>
    );
  }

  return (
    <aside className="h-full flex flex-col bg-[#FBF9F2] border-l border-[#E5DFD3]">
      {/* Header con disclaimer + metadata del modelo OCR */}
      <header className="px-5 py-3 border-b border-[#E5DFD3] bg-[#FFF8E6]">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="w-4 h-4 text-[#7A5A00]" strokeWidth={1.5} />
          <span className="smallcaps text-[#7A5A00]">Transcripción OCR</span>
          <span className="text-[10px] tabular text-[#6B6B6B] ml-auto">
            {documento.modelo} · {documento.paginas ?? 0} pág.
            {documento.confianza_promedio != null && (
              <> · {Math.round(documento.confianza_promedio * 100)}% conf.</>
            )}
          </span>
        </div>
        <p className="text-[11px] text-[#7A5A00] leading-snug">
          Texto reconocido por modelo de visión. <strong>El documento legal vinculante es el PDF original</strong>;
          esta vista existe para auditoría y comparativa.
        </p>
      </header>

      {/* Cuerpo: una sección por página */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {pageBlocks.map((p) => (
          <section
            key={p.id_ocr_pagina}
            id={`${PAGE_ID_PREFIX}-${p.pagina}`}
            className={`scroll-mt-4 ${
              activeEntity?.pagina === p.pagina ? 'ring-2 ring-[#A47148] ring-offset-2 ring-offset-[#FBF9F2] rounded-[2px]' : ''
            }`}
          >
            <header className="flex items-center justify-between mb-2 pb-1 border-b border-dashed border-[#E5DFD3]">
              <h3 className="font-serif text-[13px] text-[#0B1F3A] italic">Página {p.pagina}</h3>
              {p.confianza_promedio != null && (
                <span
                  className={`text-[10px] tabular ${
                    p.confianza_promedio < 0.7 ? 'text-[#7E1F1F]' : 'text-[#6B6B6B]'
                  }`}
                  title={p.confianza_promedio < 0.7 ? 'Baja confianza — revisar manualmente' : ''}
                >
                  {Math.round(p.confianza_promedio * 100)}% conf.
                  {p.confianza_promedio < 0.7 && ' ⚠'}
                </span>
              )}
            </header>
            <div className="text-[12.5px] leading-relaxed text-[#1C1C1C] whitespace-pre-wrap font-serif">
              {renderWithHighlight(p.texto, p.char_start, p.pagina, activeEntity)}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

/**
 * Renderiza el texto de una página resaltando la entity activa.
 *
 * Estrategia (en orden):
 *  1. **Por offsets de anchor** — si la entity tiene anchors `ocr` con
 *     `char_start/char_end` válidos en esta página, los traduce de offsets
 *     globales del .md a locales del bloque (restando `pageGlobalStart`)
 *     y los envuelve. Es robusto a texto repetido y whitespace OCR raro.
 *  2. **Fallback string-match** — para entidades legacy sin anchors
 *     persistidos, busca la primera ocurrencia del texto literal
 *     (case-insensitive). Compatible con extracciones viejas.
 *
 * Los `<mark>` llevan `data-entity-id` + `data-bbox-marker="ocr"` para
 * que LeaderLine los pueda usar como ancla visual (PDF ↔ OCR ↔ Panel).
 *
 * Si hay varios anchors en la misma página (caso típico: el mismo campo
 * aparece dos veces en la escritura), se pintan todos — la línea apunta
 * al primero por orden de aparición en el DOM.
 *
 * Devuelve React nodes (no HTML) para no inyectar XSS.
 */
function renderWithHighlight(
  text: string,
  pageGlobalStart: number,
  pageNumber: number,
  activeEntity: Entity | null,
): ReactNode {
  if (!activeEntity) return text;

  // Path 1: offsets de anchors
  const anchorRanges = (activeEntity.anchors ?? [])
    .filter((a) =>
      a.fuente_texto === 'ocr' &&
      a.estado !== 'rechazado' &&
      a.page === pageNumber &&
      a.char_start != null &&
      a.char_end != null,
    )
    .map((a) => ({
      // Convertimos global → local del bloque de la página.
      start: (a.char_start as number) - pageGlobalStart,
      end: (a.char_end as number) - pageGlobalStart,
      id_anchor: a.id_anchor,
    }))
    // Clamp + sanity: descarta ranges fuera del bloque o invertidos.
    .filter((r) => r.end > r.start && r.start >= 0 && r.start < text.length)
    .map((r) => ({ ...r, end: Math.min(r.end, text.length) }))
    // Orden ascendente para poder construir el render lineal.
    .sort((a, b) => a.start - b.start);

  if (anchorRanges.length > 0) {
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (let i = 0; i < anchorRanges.length; i++) {
      const r = anchorRanges[i];
      // Texto antes del mark.
      if (r.start > cursor) parts.push(text.slice(cursor, r.start));
      parts.push(
        <mark
          key={`a-${r.id_anchor}-${i}`}
          data-entity-id={activeEntity.id}
          data-anchor-id={r.id_anchor}
          data-bbox-marker="ocr"
          className="bg-[#FFD56B] text-[#1C1C1C] px-0.5 rounded-[1px]"
        >
          {text.slice(r.start, r.end)}
        </mark>,
      );
      cursor = r.end;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
  }

  // Path 2: fallback string-match (entidades legacy o anchors sin offsets)
  if (!activeEntity.text || activeEntity.text.length < 3) return text;
  const needle = activeEntity.text.trim();
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark
        data-entity-id={activeEntity.id}
        data-bbox-marker="ocr"
        className="bg-[#FFD56B] text-[#1C1C1C] px-0.5 rounded-[1px]"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  );
}
